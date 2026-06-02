"""
Transactional email service.

Mailjet is called from the backend so API keys never reach the browser.
"""

import base64
import hashlib
import html
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.config import settings
from app.models import Candidate, Job
from app.schemas import InterviewInviteCreate

MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send"


class EmailError(Exception):
    pass


class EmailNotConfiguredError(EmailError):
    pass


@dataclass(frozen=True)
class SentEmail:
    provider_message_id: str


async def send_interview_invitation(
    candidate: Candidate,
    job: Job,
    invite: InterviewInviteCreate,
) -> SentEmail:
    if not settings.mailjet_api_key or not settings.mailjet_secret_key or not settings.email_from:
        raise EmailNotConfiguredError("Mailjet email is not configured")

    scheduled_at = _scheduled_datetime(invite)
    ends_at = scheduled_at + timedelta(minutes=invite.duration)
    subject = f"Interview invitation for {job.title}"
    text_body = _build_text_body(candidate, job, invite, scheduled_at, ends_at)
    html_body = _build_html_body(candidate, job, invite, scheduled_at, ends_at)
    ics = _build_ics(candidate, job, invite, scheduled_at, ends_at)
    custom_id = _message_custom_id(candidate.id, invite.email, scheduled_at)

    payload: dict = {
        "Messages": [
            {
                "From": {
                    "Email": _sender_email(settings.email_from),
                    "Name": _sender_name(settings.email_from),
                },
                "To": [{"Email": invite.email, "Name": candidate.name}],
                "Subject": subject,
                "TextPart": text_body,
                "HTMLPart": html_body,
                "CustomID": custom_id,
                "Attachments": [
                    {
                        "ContentType": "text/calendar",
                        "Filename": "interview-invitation.ics",
                        "Base64Content": base64.b64encode(
                            ics.encode("utf-8")
                        ).decode("ascii"),
                    }
                ],
            }
        ]
    }
    if settings.email_reply_to:
        payload["Messages"][0]["ReplyTo"] = {
            "Email": _sender_email(settings.email_reply_to),
            "Name": _sender_name(settings.email_reply_to),
        }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            MAILJET_SEND_URL,
            auth=(settings.mailjet_api_key, settings.mailjet_secret_key),
            headers={"Content-Type": "application/json"},
            json=payload,
        )

    if response.status_code >= 400:
        raise EmailError(f"Mailjet failed with HTTP {response.status_code}: {response.text[:500]}")

    data = response.json()
    message_id = _mailjet_message_id(data)
    if not message_id:
        raise EmailError("Mailjet response did not include a message id")
    return SentEmail(provider_message_id=message_id)


def _scheduled_datetime(invite: InterviewInviteCreate) -> datetime:
    try:
        tz = ZoneInfo(invite.timezone)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown timezone: {invite.timezone}") from exc

    return datetime.combine(invite.date, invite.time, tzinfo=tz)


def _format_when(value: datetime) -> str:
    return value.strftime("%A, %B %d, %Y at %H:%M %Z")


def _place_label(invite: InterviewInviteCreate) -> str:
    return "Meeting link" if invite.format == "online" else "Location"


def _candidate_first_name(candidate: Candidate) -> str:
    return candidate.name.strip().split()[0] if candidate.name.strip() else "there"


def _build_text_body(
    candidate: Candidate,
    job: Job,
    invite: InterviewInviteCreate,
    scheduled_at: datetime,
    ends_at: datetime,
) -> str:
    interviewer_line = f"\nInterviewer: {invite.interviewer}" if invite.interviewer else ""
    utc_start = scheduled_at.astimezone(UTC)
    utc_end = ends_at.astimezone(UTC)
    return f"""Hi {_candidate_first_name(candidate)},

{invite.message}

Interview details:
Role: {job.title}
Date/time: {_format_when(scheduled_at)}
Duration: {invite.duration} minutes
{_place_label(invite)}: {invite.location}{interviewer_line}

This invitation includes a calendar file for {utc_start:%Y-%m-%d %H:%M} UTC to {utc_end:%H:%M} UTC.

Best regards,
MetaHire Recruitment Team
"""


def _build_html_body(
    candidate: Candidate,
    job: Job,
    invite: InterviewInviteCreate,
    scheduled_at: datetime,
    ends_at: datetime,
) -> str:
    interviewer = (
        f"<li><strong>Interviewer:</strong> {html.escape(invite.interviewer)}</li>"
        if invite.interviewer
        else ""
    )
    message = "<br>".join(html.escape(line) for line in invite.message.splitlines())
    when = html.escape(_format_when(scheduled_at))
    ends = html.escape(_format_when(ends_at))
    return f"""\
<div style="font-family: Inter, Arial, sans-serif; color: #1f2937; line-height: 1.55;">
  <p>Hi {html.escape(_candidate_first_name(candidate))},</p>
  <p>{message}</p>
  <div style="border-left: 4px solid #6b69ff; background: #f6f5ff;
    padding: 14px 16px; margin: 18px 0;">
    <p style="margin: 0 0 8px;"><strong>Interview details</strong></p>
    <ul style="margin: 0; padding-left: 18px;">
      <li><strong>Role:</strong> {html.escape(job.title)}</li>
      <li><strong>Date/time:</strong> {html.escape(_format_when(scheduled_at))}</li>
      <li><strong>Duration:</strong> {invite.duration} minutes</li>
      <li><strong>{_place_label(invite)}:</strong> {html.escape(invite.location)}</li>
      {interviewer}
    </ul>
  </div>
  <p>A calendar invite is attached for {when} to {ends}.</p>
  <p>Best regards,<br>MetaHire Recruitment Team</p>
</div>
"""


def _build_ics(
    candidate: Candidate,
    job: Job,
    invite: InterviewInviteCreate,
    scheduled_at: datetime,
    ends_at: datetime,
) -> str:
    now = datetime.now(UTC)
    uid = _message_custom_id(candidate.id, invite.email, scheduled_at)
    summary = f"Interview: {candidate.name} - {job.title}"
    description = f"{invite.message}\\n\\n{_place_label(invite)}: {invite.location}"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MetaHire//Interview Scheduling//EN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}@metahire",
        f"DTSTAMP:{_ics_dt(now)}",
        f"DTSTART:{_ics_dt(scheduled_at.astimezone(UTC))}",
        f"DTEND:{_ics_dt(ends_at.astimezone(UTC))}",
        f"SUMMARY:{_ics_escape(summary)}",
        f"DESCRIPTION:{_ics_escape(description)}",
        f"LOCATION:{_ics_escape(invite.location)}",
        f"ATTENDEE;CN={_ics_escape(candidate.name)};ROLE=REQ-PARTICIPANT:mailto:{invite.email}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"


def _ics_dt(value: datetime) -> str:
    return value.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _message_custom_id(candidate_id: int, email: str, scheduled_at: datetime) -> str:
    raw = f"interview:{candidate_id}:{email}:{scheduled_at.astimezone(UTC).isoformat()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _sender_email(value: str) -> str:
    if "<" in value and ">" in value:
        return value.split("<", maxsplit=1)[1].split(">", maxsplit=1)[0].strip()
    return value.strip()


def _sender_name(value: str) -> str:
    if "<" in value and ">" in value:
        name = value.split("<", maxsplit=1)[0].strip().strip('"')
        return name or settings.email_from_name
    return settings.email_from_name


def _mailjet_message_id(data: dict) -> str | None:
    messages = data.get("Messages")
    if not isinstance(messages, list) or not messages:
        return None

    recipients = messages[0].get("To")
    if not isinstance(recipients, list) or not recipients:
        return None

    recipient = recipients[0]
    message_uuid = recipient.get("MessageUUID")
    if message_uuid:
        return str(message_uuid)

    message_id = recipient.get("MessageID")
    return str(message_id) if message_id else None
