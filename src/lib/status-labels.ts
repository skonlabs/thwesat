/**
 * Centralized status labels for applications and jobs.
 * Ensures consistent wording, colors, and icons across all role screens
 * (Job Seeker, Employer, Admin, Moderator).
 *
 * Perspective lets us show role-appropriate framing for the same DB status:
 * e.g. an `applied` application is "Applied" for the seeker, "New" for the employer.
 */
import { CheckCircle, Clock, Eye, FileText, X, Calendar, Pause, XCircle, type LucideIcon } from "lucide-react";

export type Lang = "my" | "en";
export type Perspective = "seeker" | "employer" | "admin";

export interface StatusMeta {
  my: string;
  en: string;
  /** Tailwind classes for badge background + text color (uses semantic tokens). */
  color: string;
  icon: LucideIcon;
}

// ─── Application statuses ───────────────────────────────────────────────────
const applicationSeeker: Record<string, StatusMeta> = {
  applied:     { my: "လျှောက်ပြီး",      en: "Applied",     color: "bg-muted text-muted-foreground",         icon: FileText },
  submitted:   { my: "လျှောက်ပြီး",      en: "Applied",     color: "bg-muted text-muted-foreground",         icon: FileText },
  viewed:      { my: "ကြည့်ရှုပြီး",      en: "Viewed",      color: "bg-primary/10 text-primary",             icon: Eye },
  shortlisted: { my: "ရွေးချယ်ခံရ",      en: "Shortlisted", color: "bg-emerald/10 text-emerald",             icon: CheckCircle },
  interview:   { my: "အင်တာဗျူး",        en: "Interview",   color: "bg-primary/10 text-primary",             icon: Calendar },
  interviewed: { my: "အင်တာဗျူး",        en: "Interview",   color: "bg-primary/10 text-primary",             icon: Calendar },
  offered:     { my: "ကမ်းလှမ်းခံရ",     en: "Offered",     color: "bg-emerald/10 text-emerald",             icon: CheckCircle },
  placed:      { my: "ခန့်အပ်ပြီး",       en: "Placed",      color: "bg-emerald/10 text-emerald",             icon: CheckCircle },
  rejected:    { my: "ငြင်းပယ်ခံရ",      en: "Rejected",    color: "bg-destructive/10 text-destructive",     icon: X },
  withdrawn:   { my: "ရုပ်သိမ်းပြီး",      en: "Withdrawn",   color: "bg-muted text-muted-foreground",         icon: X },
};

// Employer/admin perspective: an `applied` row is "New" in their inbox.
const applicationEmployer: Record<string, StatusMeta> = {
  ...applicationSeeker,
  applied:   { ...applicationSeeker.applied,   my: "အသစ်", en: "New", color: "bg-primary/10 text-primary" },
  submitted: { ...applicationSeeker.submitted, my: "အသစ်", en: "New", color: "bg-primary/10 text-primary" },
};

export function getApplicationStatusMeta(
  status: string | null | undefined,
  perspective: Perspective = "seeker",
): StatusMeta {
  const map = perspective === "seeker" ? applicationSeeker : applicationEmployer;
  return map[status || "applied"] || map.applied;
}

export function getApplicationStatusLabel(
  status: string | null | undefined,
  lang: Lang,
  perspective: Perspective = "seeker",
): string {
  const m = getApplicationStatusMeta(status, perspective);
  return lang === "my" ? m.my : m.en;
}

// ─── Job statuses ───────────────────────────────────────────────────────────
const jobStatus: Record<string, StatusMeta> = {
  pending:  { my: "စစ်ဆေးဆဲ",  en: "Pending",  color: "bg-warning/10 text-warning",         icon: Clock },
  active:   { my: "လက်ခံနေ",   en: "Active",   color: "bg-emerald/10 text-emerald",         icon: CheckCircle },
  paused:   { my: "ခေတ္တရပ်",   en: "Paused",   color: "bg-muted text-muted-foreground",     icon: Pause },
  closed:   { my: "ပိတ်ပြီး",   en: "Closed",   color: "bg-muted text-muted-foreground",     icon: XCircle },
  rejected: { my: "ငြင်းပယ်",   en: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

export function getJobStatusMeta(status: string | null | undefined): StatusMeta {
  return jobStatus[status || "pending"] || jobStatus.pending;
}

export function getJobStatusLabel(status: string | null | undefined, lang: Lang): string {
  const m = getJobStatusMeta(status);
  return lang === "my" ? m.my : m.en;
}
