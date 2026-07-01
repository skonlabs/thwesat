import { motion } from "framer-motion";
import { Edit3, MapPin, Globe, Sparkles, TrendingUp, Bookmark, ChevronRight, KeyRound, Wallet as WalletIcon } from "lucide-react";
import { useApplications, useSavedJobIds } from "@/hooks/use-jobs";
import { useMyPackageGrants, useMyQuotas, useSubscriptionPlans, planLabel } from "@/hooks/use-subscription";
import { useWallet } from "@/hooks/use-wallet";
import { formatCurrency } from "@/lib/currency";
import type { NavigateFunction } from "react-router-dom";

interface Props {
  displayName: string;
  headline: string;
  location: string;
  remoteReady: boolean;
  avatarUrl: string | null;
  avatarInitials: string;
  completionPct: number;
  isJobseeker: boolean;
  isSystemRole?: boolean;
  lang: "my" | "en";
  onEdit: () => void;
  onNavigate: NavigateFunction;
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 24 24)"
      />
      <text x="24" y="27" textAnchor="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function ProfileDashboardHero({
  displayName, headline, location, remoteReady, avatarUrl, avatarInitials,
  completionPct, isJobseeker, isSystemRole, lang, onEdit, onNavigate,
}: Props) {
  const { data: applications = [] } = useApplications();
  const { data: savedIds = [] } = useSavedJobIds();
  const { data: grants = [] } = useMyPackageGrants();
  const { data: quotas } = useMyQuotas();
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: wallet } = useWallet();
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));
  // Show the highest tier owned, with count if multiple
  const tierRank: Record<string, number> = { free_trial: 0, starter: 1, growth: 2, business: 3, enterprise: 4 };
  const topPlan = grants
    .map((g) => planById[g.plan_id])
    .filter(Boolean)
    .sort((a: any, b: any) => (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0))[0];
  const unlocksLeft = Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));
  const planTile = {
    icon: Sparkles,
    label: lang === "my" ? "Package" : "Plan",
    value: topPlan
      ? `${planLabel(topPlan.tier)}${grants.length > 1 ? ` +${grants.length - 1}` : ""}`
      : (lang === "my" ? "မရှိ" : "None"),
    accent: true as const,
    onClick: () => onNavigate("/pricing"),
  };
  const walletTile = {
    icon: WalletIcon,
    label: lang === "my" ? "ပိုက်ဆံအိတ်" : "Wallet",
    value: formatCurrency(wallet?.balance_credits ?? 0, "MMK", lang),
    accent: true as const,
    onClick: () => onNavigate("/wallet"),
  };
  const unlocksTile = {
    icon: KeyRound,
    label: lang === "my" ? "Unlock" : "Unlocks",
    value: unlocksLeft === Infinity ? "∞" : unlocksLeft.toLocaleString(),
    accent: false as const,
    onClick: () => onNavigate("/pricing"),
  };

  const stats = isJobseeker
    ? [
        walletTile,
        {
          icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာ" : "Applications",
          value: applications.length.toString(), accent: false as const, onClick: () => onNavigate("/applications"),
        },
        {
          icon: Bookmark, label: lang === "my" ? "သိမ်းထား" : "Saved",
          value: savedIds.length.toString(), accent: false as const, onClick: () => onNavigate("/jobs/saved"),
        },
      ]
    : [planTile, unlocksTile];



  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Identity row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-base font-bold text-primary-foreground">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-foreground">{displayName}</h2>
          {headline && <p className="truncate text-xs text-muted-foreground">{headline}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={1.5} /> {location}
              </span>
            )}
            {remoteReady && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe className="h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? "အဝေးထိန်း" : "Remote"}
              </span>
            )}
          </div>
        </div>
        <button
          type="button" onClick={onEdit}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={lang === "my" ? "ပြင်ဆင်ရန်" : "Edit"}
        >
          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Stats grid */}
      <div className={`grid border-t border-border ${stats.length === 1 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="group flex items-center gap-2 border-b border-r border-border px-3 py-3 text-left last:border-r-0 sm:border-b-0 hover:bg-muted/40"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              <s.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-bold leading-tight ${s.accent ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          </button>
        ))}

        {/* Completion tile */}
        <button
          onClick={onEdit}
          className="group flex items-center gap-2 border-b border-border px-3 py-3 text-left sm:border-b-0 hover:bg-muted/40"
        >
          <CompletionRing pct={completionPct} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-foreground">
              {completionPct >= 100
                ? (lang === "my" ? "ပြည့်စုံပြီ" : "Complete")
                : (lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile complete")}
            </p>
            <p className="flex items-center gap-0.5 truncate text-[10px] text-primary">
              {lang === "my" ? "ဆက်ပြင်ရန်" : "Improve"} <ChevronRight className="h-3 w-3" strokeWidth={1.75} />
            </p>
          </div>
        </button>
      </div>
    </motion.section>
  );
}
