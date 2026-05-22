import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Check, AlertTriangle } from "lucide-react";
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

export default function AdminPartnerFinance({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { lang } = useLanguage();
  const { data: partners, isLoading: loadingPartners } = usePartners();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const _now = nowYangon();
  const [year, setYear] = useState<number>(_now.year);
  const [month, setMonth] = useState<number>(_now.month);

  const partner = useMemo<Partner | null>(
    () => partners?.find((p) => p.id === selectedId) ?? partners?.[0] ?? null,
    [partners, selectedId],
  );

  return (
    <div className={hideHeader ? "" : "min-h-screen bg-background pb-24"}>
      {!hideHeader && <PageHeader title={tt(lang, "Partner Finance", "Partner ငွေကြေး")} showBack />}
      <div className={hideHeader ? "space-y-4" : "mx-auto max-w-6xl space-y-4 px-5 md:px-8"}>
        <div className="flex flex-wrap items-end gap-3">
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
          <NewPartnerSheet lang={lang} />
        </div>

        {partner ? (
          <Tabs defaultValue="statement">
            <TabsList>
              <TabsTrigger value="statement">{tt(lang, "Monthly Statement", "လစဉ် ထုတ်ပြန်ချက်")}</TabsTrigger>
              <TabsTrigger value="attributions">{tt(lang, "Attributions", "Attribution များ")}</TabsTrigger>
              <TabsTrigger value="payments">{tt(lang, "Payments & Overrides", "ငွေပေးချေမှု & ပြင်ဆင်")}</TabsTrigger>
              <TabsTrigger value="quality">{tt(lang, "Quality Gate", "Quality Gate")}</TabsTrigger>
              <TabsTrigger value="reversals">{tt(lang, "Reversals", "ပြန်လည် နုတ်ယူ")}</TabsTrigger>
              <TabsTrigger value="history">{tt(lang, "Statement History", "မှတ်တမ်း")}</TabsTrigger>
            </TabsList>

            <TabsContent value="statement"><StatementTab partner={partner} year={year} month={month} lang={lang} /></TabsContent>
            <TabsContent value="attributions"><AttributionsTab partner={partner} lang={lang} /></TabsContent>
            <TabsContent value="payments"><PaymentsTab partner={partner} year={year} month={month} lang={lang} /></TabsContent>
            <TabsContent value="quality"><QualityTab partner={partner} year={year} month={month} lang={lang} /></TabsContent>
            <TabsContent value="reversals"><ReversalsTab lang={lang} /></TabsContent>
            <TabsContent value="history"><HistoryTab partner={partner} lang={lang} /></TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {tt(lang, "Add your first partner to begin computing revenue-share statements.", "Revenue-share ထုတ်ပြန်ချက် တွက်ချက်ရန် ပထမဆုံး partner ထည့်ပါ။")}
          </Card>
        )}
      </div>
    </div>
  );
}

// ───────────── Statement tab ─────────────
function StatementTab({ partner, year, month, lang }: { partner: Partner; year: number; month: number; lang: "en" | "my" }) {
  const { data, isLoading } = usePartnerStatementPreview(partner, year, month);
  const finalize = useFinalizeStatement();

  if (isLoading || !data) return <Card className="p-8 text-sm text-muted-foreground">{tt(lang, "Computing…", "တွက်ချက်နေသည်…")}</Card>;

  const QG_LABELS: Record<string, { name: string; cmp: string; suffix: string }> = {
    l1_sla_pct:       { name: "L1 SLA",      cmp: "≥", suffix: "%" },
    csat_score:       { name: "CSAT",        cmp: "≥", suffix: "" },
    dispute_rate_pct: { name: "Disputes",    cmp: "≤", suffix: "%" },
    fraud_rate_pct:   { name: "Fraud",       cmp: "≤", suffix: "%" },
    onboarding_pct:   { name: "Onboarding",  cmp: "≥", suffix: "%" },
  };
  const blockers: string[] = [];
  if (!data.quality_gate_passed) {
    const failing = Object.entries(data.quality_gate_breakdown || {})
      .filter(([, v]: any) => !v.pass)
      .map(([k, v]: any) => {
        const meta = QG_LABELS[k] || { name: k, cmp: "?", suffix: "" };
        return `${meta.name} ${v.value}${meta.suffix} (${tt(lang, "need", "လို")} ${meta.cmp}${v.threshold}${meta.suffix})`;
      });
    blockers.push(`${tt(lang, "Quality gate failed", "Quality gate မအောင်ပါ")} — ${failing.join(", ") || tt(lang, "missing inputs", "input လို")}.`);
  }
  if (!data.active_growth_requirement_met) blockers.push(`${tt(lang, "Active Growth requirement not met", "Active Growth စံ မပြည့်ပါ")} (Growth share = ${pct(data.active_growth_ratio)}, ${tt(lang, "need", "လို")} ≥25%).`);
  if (data.tier_approval_required) blockers.push(tt(lang,
    "Growth NPR ≥ 80M Ks — manual tier approval required (growth payout zeroed until partner_tier_approvals row exists).",
    "Growth NPR ≥ 80M Ks — ကိုယ်တိုင် tier ခွင့်ပြုချက် လိုအပ်သည် (partner_tier_approvals row မရှိမချင်း growth payout = 0)။"
  ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={tt(lang, "Gross Attributed NPR", "Gross Attributed NPR")} value={fmt(data.gross_attributed_npr)} />
        <Stat label={tt(lang, "Reversals", "ပြန်နုတ်")} value={fmt(data.reversals_npr)} tone="warn" />
        <Stat label={tt(lang, "Net Collected NPR", "Net Collected NPR")} value={fmt(data.net_collected_attributed_npr)} />
        <Stat label={tt(lang, "Total Payout", "စုစုပေါင်း ပေးချေ")} value={fmt(data.total_payout)} tone="ok" />
      </div>

      <Card className="p-3 text-xs text-muted-foreground">
        {tt(lang,
          `${data.payments_count} approved Ks payments · ${data.eligible_attributions_count}/${data.attributed_users_count} attributions eligible for onboarding metric · onboarding ${data.onboarding_pct?.toFixed(1)}%`,
          `${data.payments_count} ခု ခွင့်ပြုထား · ${data.eligible_attributions_count}/${data.attributed_users_count} attribution များ onboarding metric အတွက် ဝင်ဆံ့သည် · onboarding ${data.onboarding_pct?.toFixed(1)}%`
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{tt(lang, "Buckets (gross → net of reversals)", "အုပ်စုများ (gross → net)")}</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Row k={tt(lang, "Growth (≤12mo)", "Growth (≤၁၂လ)")} v={`${fmt(data.growth_npr_gross)} → ${fmt(data.growth_npr)}`} />
          <Row k={tt(lang, "Maintenance Y2 (13-24mo)", "Maintenance Y2 (၁၃-၂၄လ)")} v={`${fmt(data.maintenance_y2_npr_gross)} → ${fmt(data.maintenance_y2_npr)}`} />
          <Row k={tt(lang, "Maintenance Y3+ (25mo+)", "Maintenance Y3+ (၂၅လ+)")} v={`${fmt(data.maintenance_y3_npr_gross)} → ${fmt(data.maintenance_y3_npr)}`} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{tt(lang, "Tier & Bonus", "Tier & ဘောနပ်စ်")}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Row k={tt(lang, "Growth Tier", "Growth Tier")} v={pct(data.growth_tier_pct)} />
          <Row k={tt(lang, "MoM Growth", "MoM တိုးတက်မှု")} v={pct(data.mom_growth_pct)} />
          <Row k={tt(lang, "Growth Bonus", "Growth ဘောနပ်စ်")} v={`+${pct(data.growth_bonus_pct)}`} />
          <Row k={tt(lang, "Active Growth Ratio", "Active Growth အချိုး")} v={pct(data.active_growth_ratio)} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{tt(lang, "Payout Breakdown", "ပေးချေမှု ခွဲခြားချက်")}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Row k={tt(lang, "Growth Payout", "Growth ပေးချေ")} v={fmt(data.growth_payout)} />
          <Row k={tt(lang, "Maintenance Payout", "Maintenance ပေးချေ")} v={fmt(data.maintenance_payout)} />
          <Row k={tt(lang, "Bonus Payout", "ဘောနပ်စ် ပေးချေ")} v={fmt(data.bonus_payout)} />
          <Row k={`${tt(lang, "Cap", "ကန့်သတ်")} (${pct(partner.payout_cap_pct)} ${tt(lang, "of Net", "of Net")})`} v={data.cap_applied ? `${tt(lang, "Capped — uncapped was", "ကန့်သတ်ထား — uncapped မှာ")} ${fmt(data.total_payout_uncapped)}` : tt(lang, "No", "မရှိ")} />
        </div>
      </Card>

      {blockers.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" /> {tt(lang, "Blockers", "ပိတ်ဆို့မှုများ")}
          </div>
          <ul className="ml-5 list-disc space-y-1 text-sm">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          disabled={finalize.isPending}
          onClick={async () => {
            try {
              await finalize.mutateAsync({ partner_id: partner.id, year, month, preview: data });
              toast.success(tt(lang, "Statement finalized", "ထုတ်ပြန်ချက် အပြီးသတ်ပြီး"));
            } catch (e: any) { toast.error(e.message || tt(lang, "Failed", "မအောင်မြင်ပါ")); }
          }}
        >
          <Check className="mr-2 h-4 w-4" /> {tt(lang, "Finalize statement", "ထုတ်ပြန်ချက် အပြီးသတ်ရန်")}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass = tone === "ok" ? "border-emerald/30" : tone === "warn" ? "border-warning/30" : "border-border";
  return (
    <Card className={`p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div><div className="text-sm font-medium">{v}</div></div>;
}

// ───────────── Attributions tab ─────────────
function AttributionsTab({ partner, lang }: { partner: Partner; lang: "en" | "my" }) {
  const { data, isLoading, refetch } = usePartnerAttributions(partner.id);
  const [userId, setUserId] = useState("");
  const [channel, setChannel] = useState("manual");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("partner_attributions").insert({
        partner_id: partner.id,
        user_id: userId.trim(),
        channel,
        created_by: u.user?.id,
      });
      if (error) throw error;
      setUserId("");
      toast.success(tt(lang, "Attribution added", "Attribution ထည့်ပြီး"));
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
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
          <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" /> {tt(lang, "Attribute", "ထည့်")}</Button>
        </div>
      </Card>

      <Card className="divide-y">
        {isLoading ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "Loading…", "ဖွင့်နေသည်…")}</div>
          : !data || data.length === 0 ? <div className="p-4 text-sm text-muted-foreground">{tt(lang, "No attributions yet.", "Attribution မရှိသေးပါ။")}</div>
          : data.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-mono text-xs">{a.user_id}</div>
                <div className="text-xs text-muted-foreground">
                  {tt(lang, channelLabels[a.channel]?.en || a.channel, channelLabels[a.channel]?.my || a.channel)} · {tt(lang, "attributed", "သတ်မှတ်")} {new Date(a.attributed_at).toLocaleDateString()}
                  {a.first_paid_at ? ` · ${tt(lang, "first paid", "ပထမ ပေးချေ")} ${new Date(a.first_paid_at).toLocaleDateString()}` : ` · ${tt(lang, "no paid txn yet", "ပေးချေမှု မရှိသေး")}`}
                </div>
              </div>
              <Badge variant={a.first_paid_at ? "default" : "secondary"}>{a.first_paid_at ? tt(lang, "Active", "Active") : tt(lang, "Pending", "စောင့်ဆိုင်း")}</Badge>
            </div>
          ))}
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
      toast.success(tt(lang, "Saved", "သိမ်းပြီး"));
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
      toast.success(tt(lang, "Quality metrics saved", "Quality metrics သိမ်းပြီး"));
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

  const add = async () => {
    if (!paymentId.trim() || !amount) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("payment_reversals").insert({
        payment_request_id: paymentId.trim(),
        reversal_type: type,
        amount: Number(amount),
        npr_amount: npr ? Number(npr) : null,
        reason: reason || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
      toast.success(tt(lang, "Reversal recorded", "ပြန်နုတ်မှု မှတ်ပြီး"));
      setPaymentId(""); setAmount(""); setNpr(""); setReason("");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
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
        <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" /> {tt(lang, "Record", "မှတ်")}</Button>
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
