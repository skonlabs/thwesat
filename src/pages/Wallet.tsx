import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet as WalletIcon,
  Sparkles,
  Briefcase,
  Star,
  Users,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import {
  useMySubscription,
  useMyQuotas,
  useMyAddonPurchases,
  useMySubscriptionPaymentRequests,
  useSubscriptionPlans,
  useAddonProducts,
  formatMMK,
  planLabel,
} from "@/hooks/use-subscription";

const Wallet = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const navigate = useNavigate();

  const { data: sub } = useMySubscription();
  const { data: quotas } = useMyQuotas();
  const { data: addonPurchases = [] } = useMyAddonPurchases();
  const { data: payReqs = [] } = useMySubscriptionPaymentRequests();
  const { data: allPlans = [] } = useSubscriptionPlans();
  const { data: allAddons = [] } = useAddonProducts();

  const plan = useMemo(() => allPlans.find((p) => p.id === sub?.plan_id), [allPlans, sub?.plan_id]);
  const addonsById = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a])), [allAddons]);

  const pending = payReqs.filter((r) => r.status === "pending");
  const matching = addonPurchases.find((p) => addonsById[p.addon_id]?.kind === "matching" && p.status === "active");
  const branding = addonPurchases.find((p) => addonsById[p.addon_id]?.kind === "branding" && p.status === "active");

  const remaining = (total: number, used: number) => Math.max(0, total - used);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ပိုက်ဆံအိတ်" : "Wallet"} />
      <div className="mx-auto w-full max-w-4xl px-5 space-y-5">
        {/* Subscription card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <WalletIcon className="h-4 w-4" />
            <span>{my ? "လက်ရှိ Package" : "Current plan"}</span>
          </div>

          {sub && plan ? (
            <>
              <div className="mt-2 text-3xl font-bold">{planLabel(plan.tier)}</div>
              <div className="mt-0.5 text-xs opacity-80">
                {sub.cycle === "yearly" ? (my ? "နှစ်စဉ်" : "Yearly") : my ? "လစဉ်" : "Monthly"} ·{" "}
                {my ? "သက်တမ်းကုန် " : "renews on "}
                {new Date(sub.current_period_end).toLocaleDateString()}
              </div>
              {sub.launch_price_applied && sub.launch_ends_at && (
                <div className="mt-2 inline-block rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold">
                  {my ? `ပရိုမို ${new Date(sub.launch_ends_at).toLocaleDateString()} အထိ` : `Launch price until ${new Date(sub.launch_ends_at).toLocaleDateString()}`}
                </div>
              )}
              <button
                onClick={() => navigate("/pricing")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground active:opacity-90"
              >
                <ArrowUpRight className="h-4 w-4" />
                {my ? "Package ပြောင်းရန် / ထပ်ဖြည့်ရန်" : "Change plan / buy add-ons"}
              </button>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold">{my ? "Package မရှိသေးပါ" : "No active plan"}</div>
              <div className="mt-0.5 text-xs opacity-80">
                {my ? "Package တစ်ခု ရွေးချယ်၍ စတင်ပါ" : "Pick a plan to start posting jobs and unlocking candidates."}
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground"
              >
                <Sparkles className="h-4 w-4" />
                {my ? "Package ရွေးရန်" : "View pricing"}
              </button>
            </>
          )}
        </div>

        {pending.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              {my ? `${pending.length} ခု စစ်ဆေးနေသည်` : `${pending.length} payment${pending.length > 1 ? "s" : ""} pending review`}
            </div>
            <div className="mt-1 opacity-80">
              {my ? "Admin အတည်ပြုပြီးမှ Package သက်ဝင်ပါမည်။" : "Your plan/add-ons activate after admin approval."}
            </div>
          </div>
        )}

        {/* Quotas */}
        <section>
          <h2 className="mb-2 text-sm font-bold">{my ? "သုံးစွဲမှု ခြေရာခံ" : "Usage tracker"}</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <QuotaCard
              icon={Briefcase}
              label={my ? "Active Jobs" : "Active Jobs"}
              total={quotas?.is_unlimited_jobs ? Infinity : quotas?.active_jobs_quota ?? 0}
              used={quotas?.active_jobs_used ?? 0}
              hint={my ? "လုပ်ငန်းတင်နိုင်သော အရေအတွက်" : "Job posts allowed in this period"}
            />
            <QuotaCard
              icon={Users}
              label={my ? "Candidate Unlocks" : "Candidate Unlocks"}
              total={quotas?.unlocks_total ?? 0}
              used={quotas?.unlocks_used ?? 0}
              hint={my ? "ဆက်သွယ်ရန် Unlock ပြုထားသော ပမာဏ" : "Contact unlocks remaining"}
            />
            <QuotaCard
              icon={Star}
              label={my ? "Featured Job Slots" : "Featured Job Slots"}
              total={quotas?.featured_jobs_total ?? 0}
              used={quotas?.featured_jobs_used ?? 0}
              hint={my ? "Add-on မှ ရရှိသော Featured slots" : "From featured-job add-ons"}
            />
          </div>
        </section>

        {/* Active recurring add-ons */}
        <section>
          <h2 className="mb-2 text-sm font-bold">{my ? "လက်ရှိ Add-ons" : "Active add-ons"}</h2>
          <div className="space-y-2">
            <AddonStatusRow
              icon={Sparkles}
              label={my ? "Candidate Matching Pack" : "Candidate Matching Pack"}
              expiresAt={matching?.expires_at}
            />
            <AddonStatusRow
              icon={Globe}
              label={my ? "Employer Branding Page" : "Employer Branding Page"}
              expiresAt={branding?.expires_at}
            />
          </div>
        </section>

        {/* Purchase history */}
        <section>
          <h2 className="mb-2 text-sm font-bold">{my ? "ဝယ်ယူမှု မှတ်တမ်း" : "Purchase history"}</h2>
          {payReqs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {my ? "မှတ်တမ်း မရှိသေးပါ" : "No purchases yet"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {payReqs.slice(0, 20).map((r) => {
                const StatusIcon = r.status === "approved" ? CheckCircle2 : r.status === "rejected" ? XCircle : Clock;
                const tone = r.status === "approved" ? "text-emerald-600" : r.status === "rejected" ? "text-destructive" : "text-amber-600";
                const planRow = r.plan_id ? allPlans.find((p) => p.id === r.plan_id) : null;
                const addonRow = r.addon_id ? addonsById[r.addon_id] : null;
                const title =
                  r.request_type === "subscription" && planRow
                    ? `${planLabel(planRow.tier)} (${r.cycle === "yearly" ? "yearly" : "monthly"})`
                    : addonRow
                    ? (my && addonRow.label_my) || addonRow.label_en
                    : my
                    ? "ပေးပို့မှု"
                    : "Payment";
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatMMK(r.mmk_amount)} · {new Date(r.created_at).toLocaleDateString()}
                        {r.payment_method ? ` · ${r.payment_method.toUpperCase()}` : ""}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${tone}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="capitalize">{r.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const QuotaCard = ({
  icon: Icon,
  label,
  total,
  used,
  hint,
}: {
  icon: any;
  label: string;
  total: number;
  used: number;
  hint: string;
}) => {
  const unlimited = total === Infinity;
  const remaining = unlimited ? Infinity : Math.max(0, total - used);
  const pct = unlimited || total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{unlimited ? "∞" : remaining.toLocaleString()}</span>
        {!unlimited && <span className="text-[11px] text-muted-foreground">/ {total.toLocaleString()}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
      {!unlimited && total > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
};

const AddonStatusRow = ({
  icon: Icon,
  label,
  expiresAt,
}: {
  icon: any;
  label: string;
  expiresAt?: string | null;
}) => {
  const active = !!expiresAt && new Date(expiresAt).getTime() > Date.now();
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-[10px] text-muted-foreground">
            {active ? `Active until ${new Date(expiresAt!).toLocaleDateString()}` : "Not active"}
          </div>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
};

export default Wallet;
