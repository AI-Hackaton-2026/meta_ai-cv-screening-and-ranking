"""
Contact extraction helpers for parsed CV text.

These are deterministic on purpose: contact details are structured text, so we
avoid involving the LLM and keep recruiter-facing fields predictable.
"""

import re

EMAIL_RE = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)
GENERIC_LOCAL_PARTS = {
    "admin",
    "careers",
    "contact",
    "hello",
    "hr",
    "info",
    "jobs",
    "office",
    "recruiting",
    "sales",
    "support",
}


def extract_email(text: str) -> str | None:
    """
    Return the best candidate email found in parsed CV text.

    Handles common PDF extraction artifacts such as "name @ domain . com" by
    normalizing separators before matching. If multiple addresses exist, prefer
    a non-generic local part because CVs sometimes include company contacts.
    """
    if not text.strip():
        return None

    normalized = _normalize_email_spacing(text)
    matches = []
    seen = set()
    for match in EMAIL_RE.finditer(normalized):
        email = _clean_email(match.group(0))
        if email and email not in seen:
            seen.add(email)
            matches.append(email)

    if not matches:
        return None

    for email in matches:
        local_part = email.split("@", maxsplit=1)[0].lower()
        if local_part not in GENERIC_LOCAL_PARTS:
            return email
    return matches[0]


def _normalize_email_spacing(text: str) -> str:
    normalized = re.sub(r"\s*@\s*", "@", text)
    normalized = re.sub(r"\s*\.\s*", ".", normalized)
    return normalized


def _clean_email(value: str) -> str | None:
    email = value.strip().strip(".,;:()[]{}<>").lower()
    if ".." in email:
        return None
    local_part, _, domain = email.partition("@")
    if not local_part or not domain or "." not in domain:
        return None
    return email
