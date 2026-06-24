import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Plus, Check, Minus, Equal, Percent, Gift, Shield, ChevronRight, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { roundMmk } from "@/lib/finance";
import { periodBoundsYangon } from "@/lib/partner-finance";
import { useLanguage } from "@/hooks/use-language";
import {
  usePartners,
  usePartnerAttributions,
  usePartnerStatements,
  usePartnerStatementPreview,
  usePartnerQualityMetrics,
  useFinalizeStatement,
  usePaymentReversals,
  usePartnerPeriodPayments,
  useUpdatePaymentOverrides,
  useAdminAttributeUser,
  useAdminCreatePartner,
  useAdminRecordReversal,
  type Partner,
} from "@/hooks/use-partner-finance";

const fmt = (n: number) => `${roundMmk(n).toLocaleString()} Ks`;
const pct = (n: number) => `${(Number(n || 0) * 100).toFixed(1)}%`;

// Bilingual string picker. NPR/SLA/CSAT/Quality Gate stay English even in Burmese (industry terms).
const tt = (lang: "en" | "my", en: string, my: string) => (lang === "my" ? my : en);

function nowYangon() {
  const d = new Date(Date.now() + (6 * 60 + 30) * 60_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function useUserDirectoryLite(ids: string[]) {
  const key = useMemo(() => Array.from(new Set(ids)).sort().join(","), [ids]);
  return useQuery({
    queryKey: ["partner-finance-user-dir", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const uniq = Array.from(new Set(ids));
      const [{ data: profs }, { data: contacts }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", uniq),
        (supabase as any).rpc("get_user_contacts_admin", { _ids: uniq }),
      ]);
      const emailMap = new Map<string, string>((contacts || []).map((c: any) => [c.id, c.email]));
      const map = new Map<string, { name: string; email: string | null }>();
      (profs || []).forEach((p: any) => map.set(p.id, { name: p.display_name || "User", email: emailMap.get(p.id) ?? null }));
      uniq.forEach((id) => { if (!map.has(id)) map.set(id, { name: "User", email: emailMap.get(id) ?? null }); });
      return map;
    },
  });
}

export default function AdminPartnerFinance({
  hideHeader = false,
  lockedPartnerId = null,
  readOnly = false,
}: {
  hideHeader?: boolean;
  /** When set, pre-selects this partner and hides the picker (partner self-view). */
  lockedPartnerId?: string | null;
  /** When true, hides admin-only actions (finalize, overrides, new partner). */
  readOnly?: boolean;
} = {}) {
  const { lang } = useLanguage();
  const { data: partners, isLoading: loadingPartners } = usePartners();
  const [selectedId, setSelectedId] = useState<string | null>(lockedPartnerId);
  const _now = nowYangon();
  const [year, setYear] = useState<number>(_now.year);
  const [month, setMonth] = useState<number>(_now.month);

  const partner = useMemo<Partner | null>(
    () => partners?.find((p) => p.id === (lockedPartnerId ?? selectedId)) ?? (lockedPartnerId ? null : partners?.[0]) ?? null,
    [partners, selectedId, lockedPartnerId],
  );

  return (
    <div className={hideHeader ? "" : "min-h-dvh bg-background pb-24"}>
      {!hideHeader && <PageHeader title={tt(lang, "Partner Finance", "Partner ငွေကြေး")} showBack />}
      <div className={hideHeader ? "space-y-4" : "mx-auto max-w-6xl space-y-4 px-5 md:px-8"}>
        <div className="flex flex-wrap items-end gap-3">
          {!lockedPartnerId && (
            <div className="min-w-[200px] flex-1">
              <Label className="text-xs">{tt(lang, "Partner", "Partner")}</Label>
              {loadingPartners ? (
                <div className="h-10 animate-pulse rounded-md bg-muted" />
              ) : partners && partners.length > 0 ? (
                <Select value={partner?.id} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{tt(lang, "No partners yet.", "Partner မရှိသေးပါ။")}</p>
              )}
            </div>
          )}
          <div>
            <Label className="text-xs">{tt(lang, "Year", "ခုနှစ်")}</Label>
            <Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Month", "လ")}</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!readOnly && <NewPartnerSheet lang={lang} />}
        </div>

        {partner ? (
          <Tabs defaultValue="statement">
            <TabsList>
              <TabsTrigger value="statement">{tt(lang, "Monthly Statement", "လစဉ် ထုတ်ပြန်ချက်")}</TabsTrigger>
              <TabsTrigger value="attributions">{tt(lang, "Attributions", "Attribution များ")}</TabsTrigger>
              {!readOnly && <TabsTrigger value="payments">{tt(lang, "Payments & Overrides", "ငွေပေးချေမှု & ပြင်ဆင်")}</TabsTrigger>}
              <TabsTrigger value="quality">{tt(lang, "Quality Gate", "Quality Gate")}</TabsTrigger>
              <TabsTrigger value="reversals">{tt(lang, "Reversals", "ပြန်လည် နုတ်ယူ")}</TabsTrigger>
              <TabsTrigger value="history">{tt(lang, "Statement History", "မှတ်တမ်း")}</TabsTrigger>
            </TabsList>

            <TabsContent value="statement"><StatementTab partner={partner} year={year} month={month} lang={lang} readOnly={readOnly} /></TabsContent>
            <TabsContent value="attributions"><AttributionsTab partner={partner} lang={lang} /></TabsContent>
            {!readOnly && <TabsContent value="payments"><PaymentsTab partner={partner} year={year} month={month} lang={lang} /></TabsContent>}
            <TabsContent value="quality"><QualityTab partner={partner} year={year} month={month} lang={lang} /></TabsContent>
            <TabsContent value="reversals"><ReversalsTab lang={lang} /></TabsContent>
            <TabsContent value="history"><HistoryTab partner={partner} lang={lang} /></TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {lockedPartnerId
              ? tt(lang, "Loading partner…", "Partner ဖွင့်နေသည်…")
              : tt(lang, "Add your first partner to begin computing revenue-share statements.", "Revenue-share ထုတ်ပြန်ချက် တွက်ချက်ရန် ပထမဆုံး partner ထည့်ပါ။")}
          </Card>
        )}
      </div>
    </div>
  );
}

// ───────────── Statement tab (visual waterfall) ─────────────
function StatementTab({ partner, year, month, lang, readOnly = false }: { partner: Partner; year: number; month: number; lang: "en" | "my"; readOnly?: boolean }) {
  const { data, isLoading, isError, error, refetch } = usePartnerStatementPreview(partner, year, month);
  const { data: payments } = usePartnerPeriodPayments(partner, year, month);
  const { data: allReversals } = usePaymentReversals();
  const { data: attributions } = usePartnerAttributions(partner.id);
  const finalize = useFinalizeStatement();
  const [drill, setDrill] = useState<null | "gross" | "reversals" | "buckets" | "tier" | "bonus" | "cap" | "quality">(null);

  // Period-scoped reversals for this partner's attributed users.
  const periodReversals = useMemo(() => {
    if (!allReversals || !payments) return [];
    const { start, endExclusive } = periodBoundsYangon(year, month);
    const paymentIds = new Set(payments.map((p: any) => p.id));
    return allReversals.filter((r: any) => {
      if (!paymentIds.has(r.payment_request_id)) return false;
      const t = new Date(r.occurred_at).getTime();
      return t >= new Date(start).getTime() && t < new Date(endExclusive).getTime();
    });
  }, [allReversals, payments, year, month]);

  if (isError) return (
    <Card className="p-6 text-sm">
      <p className="font-semibold text-destructive">{tt(lang, "Couldn't compute statement", "ဖော်ပြ၍ မရပါ")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{(error as any)?.message || tt(lang, "Unexpected error", "မမျှော်လင့်သော အမှား")}</p>
      <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => refetch()}>{tt(lang, "Retry", "ပြန်ကြိုးစား")}</Button>
    </Card>
  );
  if (isLoading || !data) return <Card className="p-8 text-sm text-muted-foreground">{tt(lang, "Computing…", "တွက်ချက်နေသည်…")}</Card>;

  const QG_LABELS: Record<string, { name: string; cmp: string; suffix: string }> = {
    l1_sla_pct:       { name: "L1 SLA",      cmp: "≥", suffix: "%" },
    csat_score:       { name: "CSAT",        cmp: "≥", suffix: "" },
    dispute_rate_pct: { name: "Disputes",    cmp: "≤", suffix: "%" },
    fraud_rate_pct:   { name: "Fraud",       cmp: "≤", suffix: "%" },
    onboarding_pct:   { name: "Onboarding",  cmp: "≥", suffix: "%" },
  };
  const failingMetrics = Object.entries(data.quality_gate_breakdown || {}).filter(([, v]: any) => !v.pass);

  const net = Number(data.net_collected_attributed_npr || 0);
  const growth = Number(data.growth_npr || 0);
  const y2 = Number(data.maintenance_y2_npr || 0);
  const y3 = Number(data.maintenance_y3_npr || 0);
  const growthPayout = Number(data.growth_payout || 0);
  const maintPayout = Number(data.maintenance_payout || 0);
  const bonusPayout = Number(data.bonus_payout || 0);
  const uncapped = Number(data.total_payout_uncapped || 0);
  const capValue = roundMmk(net * Number(partner.payout_cap_pct || 0));
  const total = Number(data.total_payout || 0);

  // Stacked bar segments
  const segs = net > 0 ? [
    { key: "growth", label: tt(lang, "Growth", "Growth"), pct: (growth / net) * 100, color: "bg-emerald-500", value: growth },
    { key: "y2", label: tt(lang, "Y2", "Y2"), pct: (y2 / net) * 100, color: "bg-sky-500", value: y2 },
    { key: "y3", label: tt(lang, "Y3+", "Y3+"), pct: (y3 / net) * 100, color: "bg-violet-500", value: y3 },
  ] : [];

  return (
    <div className="space-y-4">
      {/* HERO — Final payout */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tt(lang, "Final payout for this period", "ဤကာလအတွက် နောက်ဆုံး ပေးချေငွေ")}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{fmt(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{year} / {String(month).padStart(2, "0")} · {partner.name}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{tt(lang, "Net NPR", "Net NPR")} {fmt(net)}</p>
            <p>{tt(lang, "Effective rate", "ထိရောက်နှုန်း")} {net > 0 ? ((total / net) * 100).toFixed(1) : "0"}%</p>
          </div>
        </div>
      </Card>

      {/* WATERFALL — clickable steps */}
      <div className="space-y-2">
        <StepCard
          n={1}
          icon="="
          title={tt(lang, "Gross Attributed NPR", "Gross Attributed NPR")}
          subtitle={tt(lang, `${data.payments_count} approved Ks payments from attributed users`, `attributed user များမှ ခွင့်ပြုထား ပေးချေမှု ${data.payments_count} ခု`)}
          value={fmt(data.gross_attributed_npr)}
          onClick={() => setDrill("gross")}
        />
        <StepCard
          n={2}
          icon="−"
          title={tt(lang, "Reversals (refunds, chargebacks, fraud)", "ပြန်နုတ်မှု (ပြန်အမ်း, chargeback, လိမ်လည်)")}
          subtitle={tt(lang, `${periodReversals.length} reversal events in period`, `ဤကာလ ပြန်နုတ်မှု ${periodReversals.length} ခု`)}
          value={`− ${fmt(data.reversals_npr)}`}
          tone="warn"
          onClick={() => setDrill("reversals")}
        />
        <StepCard
          n={3}
          icon="="
          title={tt(lang, "Net Collected NPR", "Net Collected NPR")}
          subtitle={tt(lang, "Split into age buckets — tap to inspect", "သက်တမ်း buckets ၃ ခု ခွဲ — အသေးစိတ်ကြည့်ရန် နှိပ်")}
          value={fmt(net)}
          highlight
          onClick={() => setDrill("buckets")}
        >
          {net > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {segs.map((s) => s.pct > 0 && (
                  <div key={s.key} className={s.color} style={{ width: `${s.pct}%` }} title={`${s.label} ${s.pct.toFixed(1)}%`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {segs.map((s) => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span>{s.label}: <span className="font-medium text-foreground">{fmt(s.value)}</span> ({s.pct.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StepCard>

        <StepCard
          n={4}
          icon="×"
          title={tt(lang, "Apply payout rates per bucket", "bucket တစ်ခုစီ ပေးချေနှုန်း တွက်")}
          subtitle={`Growth × ${pct(data.growth_tier_pct)} + Y2 × 7.5% + Y3+ × 5%`}
          value={fmt(growthPayout + maintPayout)}
          onClick={() => setDrill("tier")}
        >
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <FormulaChip label={tt(lang, "Growth", "Growth")} formula={`${fmt(growth)} × ${pct(data.growth_tier_pct)}`} result={fmt(growthPayout)} dim={growthPayout === 0 && growth > 0} />
            <FormulaChip label="Y2" formula={`${fmt(y2)} × 7.5%`} result={fmt(roundMmk(y2 * 0.075))} />
            <FormulaChip label="Y3+" formula={`${fmt(y3)} × 5%`} result={fmt(roundMmk(y3 * 0.05))} />
          </div>
        </StepCard>

        <StepCard
          n={5}
          icon="+"
          title={tt(lang, "Growth bonus (MoM growth)", "Growth ဘောနပ်စ် (MoM)")}
          subtitle={`MoM ${pct(data.mom_growth_pct)} → +${pct(data.growth_bonus_pct)} of Growth NPR`}
          value={`+ ${fmt(bonusPayout)}`}
          tone={bonusPayout > 0 ? "ok" : undefined}
          onClick={() => setDrill("bonus")}
        />

        <StepCard
          n={6}
          icon="="
          title={tt(lang, "Subtotal (uncapped)", "စုစုပေါင်း (မကန့်သတ်)")}
          value={fmt(uncapped)}
        />

        <StepCard
          n={7}
          icon={data.cap_applied ? "⌐" : "✓"}
          title={tt(lang, `Cap check — max ${pct(partner.payout_cap_pct)} of Net`, `ကန့်သတ် — Net ၏ အများဆုံး ${pct(partner.payout_cap_pct)}`)}
          subtitle={data.cap_applied
            ? tt(lang, `Capped: ${fmt(uncapped)} → ${fmt(total)} (cap = ${fmt(capValue)})`, `ကန့်သတ်: ${fmt(uncapped)} → ${fmt(total)}`)
            : tt(lang, `No cap applied (cap would be ${fmt(capValue)})`, `မကန့်သတ်ပါ (cap = ${fmt(capValue)})`)}
          value={fmt(total)}
          tone={data.cap_applied ? "warn" : "ok"}
          highlight
          onClick={() => setDrill("cap")}
        />
      </div>

      {/* Quality gate strip */}
      <Card
        role="button"
        onClick={() => setDrill("quality")}
        className={`flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-muted/40 ${data.quality_gate_passed ? "border-emerald-500/40" : "border-warning/40 bg-warning/5"}`}
      >
        <div className="flex items-center gap-3">
          <Shield className={`h-5 w-5 ${data.quality_gate_passed ? "text-emerald-500" : "text-warning"}`} />
          <div>
            <p className="text-sm font-semibold">{tt(lang, "Quality Gate", "Quality Gate")}: {data.quality_gate_passed ? tt(lang, "Pass", "ဖြတ်") : tt(lang, "Fail", "မဖြတ်")}</p>
            <p className="text-[11px] text-muted-foreground">
              {tt(lang, `Active Growth ratio ${pct(data.active_growth_ratio)} (need ≥25%)`, `Active Growth အချိုး ${pct(data.active_growth_ratio)} (လို ≥25%)`)}
              {failingMetrics.length > 0 && ` · ${failingMetrics.length} ${tt(lang, "metric(s) failing", "metric မအောင်")}`}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>


      {!readOnly && (
        <div className="flex justify-end">
          <Button
            disabled={finalize.isPending}
            onClick={async () => {
              try {
                await finalize.mutateAsync({ partner_id: partner.id, year, month, preview: data });
              } catch (e: any) { toast.error(e.message || tt(lang, "Failed", "မအောင်မြင်ပါ")); }
            }}
          >
            <Check className="mr-2 h-4 w-4" /> {tt(lang, "Finalize statement", "ထုတ်ပြန်ချက် အပြီးသတ်ရန်")}
          </Button>
        </div>
      )}

      {/* Drill-down sheets */}
      <DrillSheet open={drill !== null} onClose={() => setDrill(null)} title={drillTitle(drill, lang)}>
        {drill === "gross" && <GrossDrill payments={payments || []} lang={lang} />}
        {drill === "reversals" && <ReversalsDrill reversals={periodReversals} lang={lang} />}
        {drill === "buckets" && <BucketsDrill data={data} lang={lang} attributions={attributions || []} />}
        {drill === "tier" && <TierDrill data={data} partner={partner} lang={lang} />}
        {drill === "bonus" && <BonusDrill data={data} lang={lang} />}
        {drill === "cap" && <CapDrill data={data} partner={partner} lang={lang} capValue={capValue} />}
        {drill === "quality" && <QualityDrill data={data} lang={lang} qgLabels={QG_LABELS} />}
      </DrillSheet>
    </div>
  );
}

function drillTitle(d: string | null, lang: "en" | "my"): string {
  const t: Record<string, [string, string]> = {
    gross: ["Gross Attributed NPR — payments", "Gross NPR — ပေးချေမှုများ"],
    reversals: ["Reversals in period", "ဤကာလ ပြန်နုတ်မှုများ"],
    buckets: ["Net NPR by age bucket", "Net NPR — bucket များ"],
    tier: ["Tier rates breakdown", "Tier နှုန်း ခွဲခြားချက်"],
    bonus: ["Growth bonus calculation", "Growth ဘောနပ်စ် တွက်ချက်"],
    cap: ["Payout cap check", "ပေးချေငွေ ကန့်သတ်"],
    quality: ["Quality Gate metrics", "Quality Gate metrics"],
  };
  if (!d) return "";
  return lang === "my" ? t[d][1] : t[d][0];
}

function StepCard({ n, icon, title, subtitle, value, tone, highlight, onClick, children }: {
  n: number; icon: string; title: string; subtitle?: string; value: string;
  tone?: "ok" | "warn"; highlight?: boolean; onClick?: () => void; children?: React.ReactNode;
}) {
  const toneText = tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-warning" : "text-foreground";
  const border = highlight ? "border-primary/40" : "";
  const Wrap: any = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors ${border} ${onClick ? "hover:bg-muted/40" : ""}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base font-bold text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Step {n}</p>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <p className={`whitespace-nowrap text-base font-bold ${toneText}`}>{value}</p>
            {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {children}
      </div>
    </Wrap>
  );
}

function FormulaChip({ label, formula, result, dim }: { label: string; formula: string; result: string; dim?: boolean }) {
  return (
    <div className={`rounded-lg border bg-muted/30 p-2 ${dim ? "opacity-50" : ""}`}>
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{formula}</p>
      <p className="mt-0.5 text-xs font-bold">{result}</p>
    </div>
  );
}

function DrillSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function GrossDrill({ payments, lang }: { payments: any[]; lang: "en" | "my" }) {
  const userIds = useMemo(() => payments.map((p) => p.user_id), [payments]);
  const { data: dir } = useUserDirectoryLite(userIds);
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">{tt(lang, "No payments.", "ပေးချေမှု မရှိပါ။")}</p>;
  const total = payments.reduce((s, p) => s + (p.npr_amount != null ? Number(p.npr_amount) : p.payment_type === "mentor_session" ? Number(p.amount) * 0.15 : Math.max(0, Number(p.amount) - Number(p.third_party_payout || 0))), 0);
  return (
    <>
      <Card className="bg-muted/30 p-3 text-xs">
        {tt(lang, `Sum of effective NPR = `, `အသက်ဝင် NPR စုစုပေါင်း = `)}<span className="font-bold">{fmt(total)}</span>
      </Card>
      <div className="divide-y rounded-lg border">
        {payments.map((p) => {
          const eff = p.npr_amount != null ? Number(p.npr_amount)
            : p.payment_type === "mentor_session" ? Number(p.amount) * 0.15
            : Math.max(0, Number(p.amount) - Number(p.third_party_payout || 0));
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 p-3 text-xs">
              <div className="min-w-0">
                <p className="font-medium">{p.payment_type}</p>
                <p className="text-muted-foreground">{p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : "—"} · {dir?.get(p.user_id)?.name || (lang === "my" ? "သုံးစွဲသူ" : "User")}{dir?.get(p.user_id)?.email ? ` · ${dir!.get(p.user_id)!.email}` : ""}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{tt(lang, "gross", "gross")} {fmt(p.amount)}{p.third_party_payout ? ` − 3rd ${fmt(p.third_party_payout)}` : ""}</p>
              </div>
              <p className="whitespace-nowrap font-bold">{fmt(roundMmk(eff))}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ReversalsDrill({ reversals, lang }: { reversals: any[]; lang: "en" | "my" }) {
  if (reversals.length === 0) return <p className="text-sm text-muted-foreground">{tt(lang, "No reversals in this period.", "ဤကာလ ပြန်နုတ်မှု မရှိပါ။")}</p>;
  const total = reversals.reduce((s, r) => s + Number(r.npr_amount || r.amount || 0), 0);
  return (
    <>
      <Card className="bg-warning/5 p-3 text-xs">{tt(lang, "Total subtracted", "နုတ်ပြီး စုစုပေါင်း")} <span className="font-bold">{fmt(total)}</span></Card>
      <div className="divide-y rounded-lg border">
        {reversals.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-3 text-xs">
            <div>
              <p className="font-medium">{r.reversal_type}</p>
              <p className="text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</p>
              {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
            </div>
            <p className="font-bold text-warning">− {fmt(r.npr_amount || r.amount)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function BucketsDrill({ data, lang, attributions }: { data: any; lang: "en" | "my"; attributions: any[] }) {
  return (
    <>
      <Card className="bg-muted/30 p-3 text-xs text-muted-foreground">
        {tt(lang,
          "Each payment is assigned to a bucket by the attributed user's account age at period end.",
          "ပေးချေမှုတစ်ခုစီကို သုံးစွဲသူ၏ account သက်တမ်းအလိုက် bucket သတ်မှတ်သည်။"
        )}
      </Card>
      <BucketRow label={tt(lang, "Growth (≤12 months)", "Growth (≤၁၂လ)")} gross={data.growth_npr_gross} net={data.growth_npr} color="bg-emerald-500" />
      <BucketRow label={tt(lang, "Maintenance Y2 (13–24 months)", "Maintenance Y2 (၁၃–၂၄လ)")} gross={data.maintenance_y2_npr_gross} net={data.maintenance_y2_npr} color="bg-sky-500" />
      <BucketRow label={tt(lang, "Maintenance Y3+ (25+ months)", "Maintenance Y3+ (၂၅လ+)")} gross={data.maintenance_y3_npr_gross} net={data.maintenance_y3_npr} color="bg-violet-500" />
      <p className="pt-2 text-[11px] text-muted-foreground">
        {tt(lang, `${attributions.length} attributed user(s) in total.`, `attributed သုံးစွဲသူ ${attributions.length} ဦး။`)}
      </p>
    </>
  );
}

function BucketRow({ label, gross, net, color }: { label: string; gross: number; net: number; color: string }) {
  const reversed = Math.max(0, gross - net);
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span className="font-semibold">{label}</span>
        </div>
        <span className="font-bold">{fmt(net)}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">gross {fmt(gross)}{reversed > 0 ? ` − reversed ${fmt(reversed)}` : ""} = {fmt(net)}</p>
    </Card>
  );
}

function TierDrill({ data, partner, lang }: { data: any; partner: Partner; lang: "en" | "my" }) {
  const growth = Number(data.growth_npr || 0);
  return (
    <>
      <Card className="bg-muted/30 p-3 text-xs">
        {tt(lang, "Growth-tier % depends on Growth NPR size:", "Growth-tier % သည် Growth NPR ပမာဏပေါ်မူတည်သည်:")}
        <ul className="ml-4 mt-1 list-disc space-y-0.5">
          <li>&lt; 10M Ks → 15%</li>
          <li>≥ 10M Ks → 20%</li>
          <li>≥ 30M Ks → 25%</li>
          <li>≥ 80M Ks → {tt(lang, "manual approval required", "ကိုယ်တိုင် ခွင့်ပြုချက် လို")}</li>
        </ul>
      </Card>
      <Card className="p-3 text-sm">
        <p className="font-semibold">{tt(lang, "This month", "ဤလ")}</p>
        <p className="mt-1 font-mono text-xs">Growth NPR = {fmt(growth)} → {pct(data.growth_tier_pct)}</p>
        <p className="mt-1 font-mono text-xs">Growth payout = {fmt(growth)} × {pct(data.growth_tier_pct)} = <span className="font-bold">{fmt(data.growth_payout)}</span></p>
        <p className="mt-2 font-mono text-xs">Maintenance Y2 = {fmt(data.maintenance_y2_npr)} × 7.5% = {fmt(roundMmk(data.maintenance_y2_npr * 0.075))}</p>
        <p className="mt-1 font-mono text-xs">Maintenance Y3+ = {fmt(data.maintenance_y3_npr)} × 5% = {fmt(roundMmk(data.maintenance_y3_npr * 0.05))}</p>
        <p className="mt-1 font-mono text-xs font-bold">Maintenance payout = {fmt(data.maintenance_payout)}</p>
      </Card>
      {data.tier_approval_required && (
        <Card className="border-warning/40 bg-warning/5 p-3 text-xs text-warning">
          {tt(lang, "Growth NPR ≥ 80M — payout zeroed until partner_tier_approvals row exists.", "Growth NPR ≥ 80M — partner_tier_approvals row မရှိမချင်း payout = 0")}
        </Card>
      )}
    </>
  );
}

function BonusDrill({ data, lang }: { data: any; lang: "en" | "my" }) {
  return (
    <>
      <Card className="bg-muted/30 p-3 text-xs">
        {tt(lang, "MoM Growth bonus tiers:", "MoM တိုးတက်မှု ဘောနပ်စ်:")}
        <ul className="ml-4 mt-1 list-disc space-y-0.5">
          <li>≥ 15% MoM → +2%</li>
          <li>≥ 25% MoM → +3%</li>
          <li>≥ 40% MoM → +5%</li>
        </ul>
      </Card>
      <Card className="p-3 text-sm">
        <p className="font-mono text-xs">MoM growth = {pct(data.mom_growth_pct)}</p>
        <p className="mt-1 font-mono text-xs">Bonus rate = +{pct(data.growth_bonus_pct)}</p>
        <p className="mt-2 font-mono text-xs">Bonus = Growth NPR × bonus%</p>
        <p className="mt-1 font-mono text-xs">= {fmt(data.growth_npr)} × {pct(data.growth_bonus_pct)} = <span className="font-bold">{fmt(data.bonus_payout)}</span></p>
        {data.bonus_payout === 0 && data.growth_bonus_pct > 0 && (
          <p className="mt-2 text-xs text-warning">{tt(lang, "Bonus zeroed — quality gate or active-growth requirement failed.", "Bonus = 0 — quality gate / active growth မအောင်")}</p>
        )}
      </Card>
    </>
  );
}

function CapDrill({ data, partner, lang, capValue }: { data: any; partner: Partner; lang: "en" | "my"; capValue: number }) {
  return (
    <>
      <Card className="bg-muted/30 p-3 text-xs">
        {tt(lang,
          `Total payout cannot exceed ${pct(partner.payout_cap_pct)} of Net Collected NPR.`,
          `စုစုပေါင်း ပေးချေငွေသည် Net Collected NPR ၏ ${pct(partner.payout_cap_pct)} ထက် မပိုစေရ။`
        )}
      </Card>
      <Card className="p-3 text-sm">
        <p className="font-mono text-xs">Uncapped subtotal = {fmt(data.total_payout_uncapped)}</p>
        <p className="mt-1 font-mono text-xs">Cap = {fmt(data.net_collected_attributed_npr)} × {pct(partner.payout_cap_pct)} = {fmt(capValue)}</p>
        <p className="mt-2 font-mono text-xs font-bold">
          Final = min(uncapped, cap) = {fmt(data.total_payout)}
        </p>
        {data.cap_applied && (
          <p className="mt-2 text-xs text-warning">
            {tt(lang, `Cap applied — partner loses ${fmt(data.total_payout_uncapped - data.total_payout)}.`, `ကန့်သတ်ထား — ${fmt(data.total_payout_uncapped - data.total_payout)} လျှော့`)}
          </p>
        )}
      </Card>
    </>
  );
}

function QualityDrill({ data, lang, qgLabels }: { data: any; lang: "en" | "my"; qgLabels: Record<string, { name: string; cmp: string; suffix: string }> }) {
  const entries = Object.entries(data.quality_gate_breakdown || {});
  return (
    <>
      <Card className={`p-3 text-sm ${data.quality_gate_passed ? "border-emerald-500/40" : "border-warning/40 bg-warning/5"}`}>
        <p className="font-semibold">{tt(lang, "Status", "အခြေအနေ")}: {data.quality_gate_passed ? tt(lang, "Pass — all 5 metrics meet threshold", "ဖြတ် — ၅ မျိုးလုံး ဖြတ်") : tt(lang, "Fail — growth payout & bonus zeroed", "မဖြတ် — growth payout & bonus = 0")}</p>
      </Card>
      <div className="space-y-2">
        {entries.map(([k, v]: any) => {
          const m = qgLabels[k] || { name: k, cmp: "?", suffix: "" };
          return (
            <Card key={k} className={`flex items-center justify-between p-3 text-sm ${v.pass ? "" : "border-warning/40"}`}>
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{tt(lang, "need", "လို")} {m.cmp} {v.threshold}{m.suffix}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm ${v.pass ? "text-emerald-600 dark:text-emerald-400" : "text-warning"}`}>{v.value}{m.suffix}</span>
                {v.pass ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-warning" />}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-3 text-xs text-muted-foreground">
        {tt(lang, "Active Growth ratio", "Active Growth အချိုး")}: <span className="font-mono">{pct(data.active_growth_ratio)}</span> ({tt(lang, "need", "လို")} ≥25%) — {data.active_growth_requirement_met ? tt(lang, "OK", "OK") : tt(lang, "fails — growth payout zeroed", "မအောင် — growth payout = 0")}
      </Card>
    </>
  );
}

// ───────────── Attributions tab ─────────────
function AttributionsTab({ partner, lang }: { partner: Partner; lang: "en" | "my" }) {
  const { data, isLoading, refetch } = usePartnerAttributions(partner.id);
  const userIds = useMemo(() => (data || []).map((a: any) => a.user_id), [data]);
  const { data: dir } = useUserDirectoryLite(userIds);
  const [userId, setUserId] = useState("");
  const [channel, setChannel] = useState("manual");
  const attribute = useAdminAttributeUser();

  const add = async () => {
    if (!userId.trim()) return;
    try {
      await attribute.mutateAsync({ partner_id: partner.id, user_id: userId.trim(), channel });
      setUserId("");
      refetch();
    } catch (e: any) {
      const map: Record<string, string> = {
        user_not_found: tt(lang, "No user with that ID", "ထို ID နှင့် တူသော အသုံးပြုသူ မရှိ"),
        partner_not_found: tt(lang, "Partner not found", "Partner မတွေ့ပါ"),
        invalid_channel: tt(lang, "Invalid channel", "Channel မမှန်ပါ"),
        not_authorized: tt(lang, "Admin/Moderator only", "Admin/Moderator သာ"),
      };
      toast.error(map[e?.message as string] || e?.message || "Failed");
    }
  };

  const channelLabels: Record<string, { en: string; my: string }> = {
    manual: { en: "Manual", my: "ကိုယ်တိုင်" },
    referral: { en: "Referral", my: "ညွှန်းပေး" },
    import: { en: "Import", my: "Import" },
    campaign: { en: "Campaign", my: "ကမ်ပိန်း" },
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{tt(lang, "Add attribution", "Attribution ထည့်ရန်")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[260px]">
            <Label className="text-xs">{tt(lang, "User ID (UUID)", "သုံးစွဲသူ ID (UUID)")}</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={tt(lang, "auth user id", "auth user id")} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Channel", "Channel")}</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(channelLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{tt(lang, v.en, v.my)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={attribute.isPending}><Plus className="mr-1 h-4 w-4" /> {tt(lang, "Attribute", "ထည့်")}</Button>
        </div>
      </Card>

      <Card className="divide-y">
        {isLoading ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</div>
          : !data || data.length === 0 ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "No attributions yet.", "Attribution မရှိသေးပါ။")}</div>
          : data.map((a: any) => {
            const u = dir?.get(a.user_id);
            const email = u?.email;
            const linkTo = `/admin/users${email ? `?q=${encodeURIComponent(email)}` : ""}`;
            return (
            <div key={a.id} className="flex items-center justify-between p-3 text-sm">
              <div className="min-w-0">
                <Link to={linkTo} className="block hover:text-primary hover:underline">
                  <span className="font-semibold text-foreground">{u?.name || "User"}</span>
                  {email && <span className="text-xs text-muted-foreground"> · {email}</span>}
                </Link>
                <div className="font-mono text-[10px] text-muted-foreground">{a.user_id}</div>
                <div className="text-xs text-muted-foreground">
                  {tt(lang, channelLabels[a.channel]?.en || a.channel, channelLabels[a.channel]?.my || a.channel)} · {tt(lang, "attributed", "သတ်မှတ်")} {new Date(a.attributed_at).toLocaleDateString()}
                  {a.first_paid_at ? ` · ${tt(lang, "first paid", "ပထမ ပေးချေ")} ${new Date(a.first_paid_at).toLocaleDateString()}` : ` · ${tt(lang, "no paid txn yet", "ပေးချေမှု မရှိသေး")}`}
                </div>
              </div>
              <Badge variant={a.first_paid_at ? "default" : "secondary"}>{a.first_paid_at ? tt(lang, "Active", "Active") : tt(lang, "Pending", "စောင့်ဆိုင်း")}</Badge>
            </div>
            );
          })}
      </Card>
    </div>
  );
}

// ───────────── Payments & Overrides tab ─────────────
function PaymentsTab({ partner, year, month, lang }: { partner: Partner; year: number; month: number; lang: "en" | "my" }) {
  const { data, isLoading } = usePartnerPeriodPayments(partner, year, month);
  const { data: statements } = usePartnerStatements(partner.id);
  const update = useUpdatePaymentOverrides();
  const locked = (statements || []).some((s: any) => s.period_year === year && s.period_month === month && s.status === "finalized");

  if (isLoading) return <Card className="p-4 text-sm text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</Card>;
  if (!data || data.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">{tt(lang, "No approved Ks payments for attributed users in this period.", "ဤကာလအတွင်း attributed user များအတွက် ခွင့်ပြုထားသော Ks ပေးချေမှု မရှိပါ။")}</Card>;
  }

  return (
    <div className="space-y-3">
      {locked && (
        <Card className="border-warning/40 bg-warning/10 p-3 text-xs">
          🔒 {tt(lang,
            "This period is finalized. Overrides are locked by the database; saves will fail with period_locked.",
            "ဤကာလကို အပြီးသတ်ပြီးပါပြီ။ Override ပြင်ဆင်မှု ပိတ်ထားသည် (period_locked)။")}
        </Card>
      )}
      <Card className="p-3 text-xs text-muted-foreground">
        {tt(lang,
          "Edit per-payment third-party payout (e.g. agent/recruiter cut deducted before NPR), an explicit NPR override, or the revenue classification (new / expansion / reactivation). Changes recompute the statement preview live.",
          "ပေးချေမှုတစ်ခုစီ၏ third-party payout (ဥပမာ NPR မတိုင်ခင် agent/recruiter ဖြတ်) ၊ NPR override သို့မဟုတ် revenue classification (new / expansion / reactivation) ကို ပြင်ပါ။ ပြောင်းမှု အသက်ဝင်လျှင် statement preview ပြန်တွက်ပါသည်။"
        )}
      </Card>
      <Card className="divide-y">
        {data.map((p: any) => (
          <PaymentRow key={p.id} p={p} lang={lang} locked={locked} onSave={(patch) => update.mutateAsync({ id: p.id, ...patch })} />
        ))}
      </Card>
    </div>
  );
}

function PaymentRow({ p, onSave, lang, locked }: { p: any; onSave: (patch: any) => Promise<void>; lang: "en" | "my"; locked?: boolean }) {
  const [tpp, setTpp] = useState<string>(p.third_party_payout != null ? String(p.third_party_payout) : "");
  const [npr, setNpr] = useState<string>(p.npr_amount != null ? String(p.npr_amount) : "");
  const [cls, setCls] = useState<string>(p.revenue_classification || "new");
  const [busy, setBusy] = useState(false);

  const dirty =
    String(p.third_party_payout ?? "") !== tpp ||
    String(p.npr_amount ?? "") !== npr ||
    (p.revenue_classification || "new") !== cls;

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        third_party_payout: tpp === "" ? 0 : Number(tpp),
        npr_amount: npr === "" ? null : Number(npr),
        revenue_classification: cls,
      });
      // success is silent per UX policy
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const computedNpr = npr !== "" ? roundMmk(Number(npr))
    : p.payment_type === "mentor_session" ? roundMmk(Number(p.amount || 0) * 0.15)
    : roundMmk(Math.max(0, Number(p.amount || 0) - Number(tpp || 0)));

  return (
    <div className="space-y-2 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{p.payment_type} · {fmt(p.amount)}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{p.id}</div>
          <div className="text-xs text-muted-foreground">
            {tt(lang, "user", "သုံးစွဲသူ")} {p.user_id.slice(0, 8)}… · {new Date(p.reviewed_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{tt(lang, "Effective NPR", "အသက်ဝင် NPR")}</div>
          <div className="font-bold">{fmt(computedNpr)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div>
          <Label className="text-[10px]">{tt(lang, "3rd-party payout", "3rd-party payout")}</Label>
          <Input type="number" value={tpp} onChange={(e) => setTpp(e.target.value)} disabled={locked} />
        </div>
        <div>
          <Label className="text-[10px]">{tt(lang, "NPR override", "NPR override")}</Label>
          <Input type="number" value={npr} onChange={(e) => setNpr(e.target.value)} placeholder={tt(lang, "auto", "အလို")} disabled={locked} />
        </div>
        <div>
          <Label className="text-[10px]">{tt(lang, "Classification", "ခွဲခြားမှု")}</Label>
          <Select value={cls} onValueChange={setCls} disabled={locked}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{tt(lang, "New", "အသစ်")}</SelectItem>
              <SelectItem value="expansion">{tt(lang, "Expansion", "ချဲ့ထွင်")}</SelectItem>
              <SelectItem value="reactivation">{tt(lang, "Reactivation", "ပြန်သက်ဝင်")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button size="sm" disabled={!dirty || busy || locked} onClick={save} className="w-full">{tt(lang, "Save", "သိမ်း")}</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────── Quality tab ─────────────
function QualityTab({ partner, year, month, lang }: { partner: Partner; year: number; month: number; lang: "en" | "my" }) {
  const { data, refetch } = usePartnerQualityMetrics(partner.id);
  const { data: statements } = usePartnerStatements(partner.id);
  const locked = (statements || []).some((s: any) => s.period_year === year && s.period_month === month && s.status === "finalized");
  const existing = data?.find((d: any) => d.period_year === year && d.period_month === month);
  const [vals, setVals] = useState({
    l1_sla_pct: existing?.l1_sla_pct ?? "",
    csat_score: existing?.csat_score ?? "",
    dispute_rate_pct: existing?.dispute_rate_pct ?? "",
    fraud_rate_pct: existing?.fraud_rate_pct ?? "",
    notes: existing?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("partner_quality_metrics").upsert({
        partner_id: partner.id, period_year: year, period_month: month,
        l1_sla_pct: vals.l1_sla_pct === "" ? null : Number(vals.l1_sla_pct),
        csat_score: vals.csat_score === "" ? null : Number(vals.csat_score),
        dispute_rate_pct: vals.dispute_rate_pct === "" ? null : Number(vals.dispute_rate_pct),
        fraud_rate_pct: vals.fraud_rate_pct === "" ? null : Number(vals.fraud_rate_pct),
        notes: vals.notes || null,
        recorded_by: u.user?.id,
      }, { onConflict: "partner_id,period_year,period_month" });
      if (error) throw error;
      // success is silent per UX policy
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-sm font-semibold">{tt(lang, "Quality metrics", "Quality metrics")} — {year}/{String(month).padStart(2, "0")}</h3>
      {locked && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
          🔒 {tt(lang, "Period finalized — quality metrics locked.", "ဤကာလ အပြီးသတ်ပြီး — Quality metrics ပိတ်ထားသည်။")}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {tt(lang,
          "Onboarding-within-7d % is computed automatically from attributions (employer profile complete + ≥1 job within 7 days of joining). The four metrics below are admin-entered.",
          "Onboarding-within-7d % ကို attribution များမှ အလိုအလျောက် တွက်ပါသည် (employer profile ပြည့်စုံ + ၇ ရက်အတွင်း ≥၁ job)။ အောက်ပါ ၄ ခုကို admin ထည့်ရပါမည်။"
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <NumField label="L1 SLA % (≥90)" value={vals.l1_sla_pct} disabled={locked} onChange={(v) => setVals({ ...vals, l1_sla_pct: v })} />
        <NumField label="CSAT (≥4.0)" value={vals.csat_score} disabled={locked} onChange={(v) => setVals({ ...vals, csat_score: v })} />
        <NumField label={tt(lang, "Dispute % (≤1)", "Dispute % (≤၁)")} value={vals.dispute_rate_pct} disabled={locked} onChange={(v) => setVals({ ...vals, dispute_rate_pct: v })} />
        <NumField label={tt(lang, "Fraud % (≤0.5)", "Fraud % (≤၀.၅)")} value={vals.fraud_rate_pct} disabled={locked} onChange={(v) => setVals({ ...vals, fraud_rate_pct: v })} />
      </div>
      <div>
        <Label className="text-xs">{tt(lang, "Notes", "မှတ်ချက်")}</Label>
        <Input value={vals.notes} onChange={(e) => setVals({ ...vals, notes: e.target.value })} disabled={locked} />
      </div>
      <Button onClick={save} disabled={busy || locked}>{tt(lang, "Save metrics", "Metrics သိမ်း")}</Button>
    </Card>
  );
}
function NumField({ label, value, onChange, disabled }: { label: string; value: any; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

// ───────────── Reversals tab ─────────────
function ReversalsTab({ lang }: { lang: "en" | "my" }) {
  const { data, isLoading, refetch } = usePaymentReversals();
  const [paymentId, setPaymentId] = useState("");
  const [type, setType] = useState("refund");
  const [amount, setAmount] = useState("");
  const [npr, setNpr] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const typeLabels: Record<string, { en: string; my: string }> = {
    refund: { en: "Refund", my: "ပြန်အမ်း" },
    chargeback: { en: "Chargeback", my: "Chargeback" },
    reversal: { en: "Reversal", my: "ပြန်ဖျက်" },
    unpaid: { en: "Unpaid", my: "မပေးချေ" },
    fraud_writeoff: { en: "Fraud writeoff", my: "လိမ်လည် ဖျက်" },
  };

  const record = useAdminRecordReversal();

  const add = async () => {
    if (!paymentId.trim() || !amount) return;
    try {
      await record.mutateAsync({
        payment_request_id: paymentId.trim(),
        reversal_type: type,
        amount: Number(amount),
        npr_amount: npr ? Number(npr) : null,
        reason: reason || null,
      });
      setPaymentId(""); setAmount(""); setNpr(""); setReason("");
      refetch();
    } catch (e: any) {
      const map: Record<string, string> = {
        payment_not_found: tt(lang, "No payment with that ID", "ထို ID နှင့် ပေးချေမှု မရှိ"),
        amount_must_be_positive: tt(lang, "Amount must be greater than zero", "ပမာဏသည် ၀ ထက်ကြီးရမည်"),
        amount_exceeds_payment: tt(lang, "Reversal exceeds original payment amount", "ပြန်နုတ်မှု မူရင်းပေးချေမှုထက် ပိုနေသည်"),
        invalid_reversal_type: tt(lang, "Invalid reversal type", "Reversal အမျိုးအစား မမှန်ပါ"),
        not_authorized: tt(lang, "Admin only", "Admin သာ"),
      };
      toast.error(map[e?.message as string] || e?.message || "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{tt(lang, "Record reversal / clawback", "ပြန်နုတ်/clawback မှတ်ရန်")}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">{tt(lang, "Payment ID", "ပေးချေမှု ID")}</Label>
            <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="payment_requests.id" />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Type", "အမျိုးအစား")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{tt(lang, v.en, v.my)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "Amount", "ပမာဏ")}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{tt(lang, "NPR (optional)", "NPR (ရွေး)")}</Label>
            <Input type="number" value={npr} onChange={(e) => setNpr(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">{tt(lang, "Reason", "အကြောင်းပြချက်")}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={add} disabled={record.isPending}><Plus className="mr-1 h-4 w-4" /> {tt(lang, "Record", "မှတ်")}</Button>
      </Card>

      <Card className="divide-y">
        {isLoading ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</div>
          : !data || data.length === 0 ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "No reversals.", "ပြန်နုတ်မှု မရှိပါ။")}</div>
          : data.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">{tt(lang, typeLabels[r.reversal_type]?.en || r.reversal_type, typeLabels[r.reversal_type]?.my || r.reversal_type)} · {fmt(r.amount)}{r.npr_amount ? ` (NPR ${fmt(r.npr_amount)})` : ""}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.occurred_at).toLocaleString()} · {r.payment_request_id}</div>
                {r.reason && <div className="text-xs text-muted-foreground">{r.reason}</div>}
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}

// ───────────── History tab ─────────────
function HistoryTab({ partner, lang }: { partner: Partner; lang: "en" | "my" }) {
  const { data, isLoading } = usePartnerStatements(partner.id);
  if (isLoading) return <Card className="p-4 text-sm">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</Card>;
  if (!data || data.length === 0) return <Card className="p-4 text-sm text-muted-foreground">{tt(lang, "No statements yet.", "ထုတ်ပြန်ချက် မရှိသေးပါ။")}</Card>;
  const statusLabels: Record<string, { en: string; my: string }> = {
    paid: { en: "Paid", my: "ပေးချေပြီး" },
    finalized: { en: "Finalized", my: "အပြီးသတ်" },
    draft: { en: "Draft", my: "မူကြမ်း" },
  };
  return (
    <Card className="divide-y">
      {data.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-semibold">{s.period_year}/{String(s.period_month).padStart(2, "0")}</div>
            <div className="text-xs text-muted-foreground">
              {tt(lang, "Net NPR", "Net NPR")} {fmt(s.net_collected_attributed_npr)} · {tt(lang, "Tier", "Tier")} {pct(s.growth_tier_pct)} +{pct(s.growth_bonus_pct)} ·
              {s.cap_applied ? ` ${tt(lang, "capped", "ကန့်သတ်")}` : ` ${tt(lang, "uncapped", "မကန့်သတ်")}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">{fmt(s.total_payout)}</div>
            <Badge variant={s.status === "paid" ? "default" : s.status === "finalized" ? "secondary" : "outline"}>
              {tt(lang, statusLabels[s.status]?.en || s.status, statusLabels[s.status]?.my || s.status)}
            </Badge>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ───────────── New partner sheet ─────────────
function NewPartnerSheet({ lang }: { lang: "en" | "my" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name || !code) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("partners").insert({
        name, code, contract_start_date: start,
      });
      if (error) throw error;
      toast.success(tt(lang, "Partner created", "Partner ဖန်တီးပြီး"));
      qc.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false); setName(""); setCode("");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> {tt(lang, "New partner", "Partner အသစ်")}</Button></SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>{tt(lang, "New partner", "Partner အသစ်")}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div><Label className="text-xs">{tt(lang, "Name", "နာမည်")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">{tt(lang, "Code", "ကုဒ်")}</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
          <div><Label className="text-xs">{tt(lang, "Contract start", "စာချုပ် စတင်")}</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <Button onClick={submit} disabled={busy} className="w-full">{tt(lang, "Create", "ဖန်တီး")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
