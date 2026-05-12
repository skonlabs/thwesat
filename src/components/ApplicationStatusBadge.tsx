import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for application status pills.
 * Normalises legacy status names ("interviewed" → "interview", "submitted" → "applied")
 * and renders consistent colour + bilingual label everywhere.
 */
export type ApplicationStatus =
  | "applied" | "submitted" | "viewed" | "shortlisted"
  | "interview" | "interviewed" | "offered" | "placed"
  | "rejected" | "withdrawn";

const STATUS_META: Record<string, { color: string; en: string; my: string }> = {
  applied:     { color: "bg-muted text-muted-foreground",        en: "Applied",      my: "လျှောက်ထားပြီး" },
  viewed:      { color: "bg-info/15 text-info",                  en: "Viewed",       my: "ကြည့်ရှုပြီး" },
  shortlisted: { color: "bg-primary/15 text-primary",            en: "Shortlisted",  my: "ရွေးချယ်ထားပြီး" },
  interview:   { color: "bg-accent/15 text-accent-foreground",   en: "Interview",    my: "အင်တာဗျူး" },
  offered:     { color: "bg-emerald/15 text-emerald",            en: "Offered",      my: "ကမ်းလှမ်းပြီး" },
  placed:      { color: "bg-emerald/15 text-emerald",            en: "Placed",       my: "ခန့်အပ်ပြီး" },
  rejected:    { color: "bg-destructive/15 text-destructive",    en: "Rejected",     my: "ငြင်းပယ်ပြီး" },
  withdrawn:   { color: "bg-muted text-muted-foreground",        en: "Withdrawn",    my: "ရုပ်သိမ်းပြီး" },
};

function normalize(status: string): keyof typeof STATUS_META {
  if (status === "submitted") return "applied";
  if (status === "interviewed") return "interview";
  return (STATUS_META[status] ? status : "applied") as keyof typeof STATUS_META;
}

interface Props {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export default function ApplicationStatusBadge({ status, className, size = "sm" }: Props) {
  const { language: lang } = useLanguage();
  const key = normalize(status);
  const meta = STATUS_META[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        meta.color,
        className
      )}
    >
      {lang === "my" ? meta.my : meta.en}
    </span>
  );
}
