import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Send,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const DURATIONS = [30, 45, 60, 90];

export function ScheduleInterviewDialog({ open, candidate, jobTitle, onClose, onSend }) {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );
  const defaults = useMemo(() => buildDefaults(candidate, jobTitle), [candidate, jobTitle]);
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (!open) return;
    setForm(defaults);

    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [defaults, onClose, open]);

  if (!open || !candidate) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const locationLabel = form.format === "online" ? "Meeting link" : "Location";
  const locationPlaceholder =
    form.format === "online"
      ? "https://meet.google.com/..."
      : "e.g. Symphony Sarajevo, meeting room 3";
  const isValid =
    form.email.trim() &&
    form.date &&
    form.time &&
    form.location.trim() &&
    (form.format !== "online" || isValidUrl(form.location));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    onSend?.({ ...form, timezone });
  };

  return (
    <div
      className="mh-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        className="mh-modal mh-interview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
      >
        <button className="mh-icon-btn mh-modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="mh-modal-head">
          <div className="mh-modal-head-icon">
            <CalendarDays size={20} strokeWidth={2.1} />
          </div>
          <div>
            <h2 id="schedule-interview-title" className="mh-modal-title">
              Schedule interview
            </h2>
            <p className="mh-modal-subtitle">
              Prepare an invitation for {candidate.name}.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mh-modal-body">
          <Field label="Candidate email" icon={<Mail size={14} />} required>
            <input
              autoFocus
              className="mh-input"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="candidate@example.com"
              required
            />
          </Field>

          <div className="mh-interview-grid">
            <Field label="Interview date" icon={<CalendarDays size={14} />} required>
              <input
                className="mh-input"
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                required
              />
            </Field>
            <Field label="Start time" icon={<Clock3 size={14} />} required>
              <input
                className="mh-input"
                type="time"
                value={form.time}
                onChange={(event) => update("time", event.target.value)}
                required
              />
            </Field>
          </div>

          <div className="mh-interview-grid">
            <Field label="Recruiter timezone" icon={<Clock3 size={14} />}>
              <input className="mh-input" value={timezone} readOnly />
            </Field>
            <Field label="Duration" icon={<Clock3 size={14} />}>
              <select
                className="mh-input"
                value={form.duration}
                onChange={(event) => update("duration", Number(event.target.value))}
              >
                {DURATIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} minutes
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Format" icon={<Video size={14} />} required>
            <div className="mh-format-options">
              <FormatOption
                active={form.format === "online"}
                icon={<Video size={15} />}
                label="Online"
                onClick={() =>
                  setForm((current) => ({ ...current, format: "online", location: "" }))
                }
              />
              <FormatOption
                active={form.format === "in_person"}
                icon={<MapPin size={15} />}
                label="In person"
                onClick={() =>
                  setForm((current) => ({ ...current, format: "in_person", location: "" }))
                }
              />
            </div>
          </Field>

          <Field label={locationLabel} icon={<MapPin size={14} />} required>
            <input
              className="mh-input"
              type={form.format === "online" ? "url" : "text"}
              value={form.location}
              onChange={(event) => update("location", event.target.value)}
              placeholder={locationPlaceholder}
              required
            />
          </Field>

          <Field label="Interviewer name" icon={<UserRound size={14} />} hint="Optional">
            <input
              className="mh-input"
              value={form.interviewer}
              onChange={(event) => update("interviewer", event.target.value)}
              placeholder="e.g. Amra Hadzic"
            />
          </Field>

          <Field label="Message" icon={<Mail size={14} />}>
            <textarea
              className="mh-textarea mh-interview-message"
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
            />
          </Field>

          <EmailPreview
            candidate={candidate}
            jobTitle={jobTitle}
            form={form}
            timezone={timezone}
          />

          <div className="mh-modal-foot">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              <Send size={15} />
              Send invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon, hint, required, children }) {
  return (
    <div className="mh-field">
      <div className="mh-field-head">
        <label className="mh-field-label">
          <span className="text-[var(--primary)]">{icon}</span>
          {label}
          {required && <span className="text-[var(--primary)]">*</span>}
        </label>
        {hint && <span className="mh-field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FormatOption({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      className={`mh-format-option ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function EmailPreview({ candidate, jobTitle, form, timezone }) {
  return (
    <section className="mh-email-preview">
      <div className="mh-email-preview-head">
        <span className="mh-field-label">
          <Eye size={14} />
          Email preview
        </span>
        <span className="mh-email-preview-tag">Candidate-facing</span>
      </div>
      <div className="mh-email-preview-body">
        <p className="mh-email-line">
          <strong>To:</strong> {form.email || "Candidate email"}
        </p>
        <p className="mh-email-line">
          <strong>Subject:</strong> Interview invitation for {jobTitle || "your application"}
        </p>
        <div className="mh-email-divider" />
        <p>Hi {firstName(candidate.name)},</p>
        <p className="whitespace-pre-line">{form.message}</p>
        <div className="mh-email-details">
          <span>
            <strong>Date:</strong> {formatDate(form.date)}
          </span>
          <span>
            <strong>Time:</strong> {form.time || "Not selected"} ({timezone})
          </span>
          <span>
            <strong>Duration:</strong> {form.duration} minutes
          </span>
          <span>
            <strong>{form.format === "online" ? "Meeting link" : "Location"}:</strong>{" "}
            {form.location || "Not provided"}
          </span>
          {form.interviewer && (
            <span>
              <strong>Interviewer:</strong> {form.interviewer}
            </span>
          )}
        </div>
        <p>Best regards,</p>
        <p>MetaHire Recruitment Team</p>
      </div>
    </section>
  );
}

function buildDefaults(candidate, jobTitle) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    email: candidate?.email || inferredDemoEmail(candidate?.name),
    date: formatInputDate(tomorrow),
    time: "10:00",
    duration: 45,
    format: "online",
    location: "",
    interviewer: "",
    message: `Thank you for your interest in the ${jobTitle || "open"} position. We were impressed by your background and would like to invite you to an interview.`,
  };
}

function inferredDemoEmail(name = "") {
  const localPart = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
  return localPart ? `${localPart}@email.com` : "";
}

function firstName(name = "") {
  return name.trim().split(/\s+/)[0] || "there";
}

function formatInputDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function isValidUrl(value) {
  try {
    return Boolean(new URL(value.trim()));
  } catch {
    return false;
  }
}
