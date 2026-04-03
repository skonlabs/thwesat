import { useLanguage } from "@/hooks/use-language";
import type { UserStatus } from "@/hooks/use-presence";

interface UserStatusBadgeProps {
  status: UserStatus;
  size?: "sm" | "md";
}

const statusConfig = {
  online: {
    dotClass: "bg-emerald",
    badgeClass: "bg-emerald/10 text-emerald",
    labelEn: "Online",
    labelMy: "အွန်လိုင်း",
  },
  busy: {
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600",
    labelEn: "Busy",
    labelMy: "အလုပ်များနေ",
  },
  offline: {
    dotClass: "bg-muted-foreground/40",
    badgeClass: "bg-muted text-muted-foreground",
    labelEn: "Offline",
    labelMy: "အော့ဖ်လိုင်း",
  },
};

export function UserStatusBadge({ status, size = "sm" }: UserStatusBadgeProps) {
  const { lang } = useLanguage();
  const config = statusConfig[status];

  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${padding} ${textSize} font-medium ${config.badgeClass}`}>
      <span className={`${dotSize} rounded-full ${config.dotClass}`} />
      {lang === "my" ? config.labelMy : config.labelEn}
    </span>
  );
}
