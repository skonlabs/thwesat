import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import FinanceOverview from "@/components/finance/FinanceOverview";
import PartnerReferrals from "./PartnerReferrals";
import { usePartners, usePartnerStatements, usePartnerAttributions, usePartnerStatementPreview } from "@/hooks/use-partner-finance";

const TABS = ["overview", "statements", "attributions", "referrals"] as const;
type TabKey = typeof TABS[number];

const fmt = (n: number) => `${(Math.round(Number(n || 0) / 100) * 100).toLocaleString()} Ks`;
const pct = (n: number) => `${(Number(n || 0) * 100).toFixed(1)}%`;

function nowYangon() {
  const d = new Date(Date.now() + (6 * 60 + 30) * 60_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/**
 * Partner-facing Finance Hub. Auto-resolves the current partner via
 * current_partner_id() and scopes every number to their attributed users only.
 */
export default function PartnerFinanceHub() {
  const { lang } = useLanguage();
  const my = lang === "my";
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.includes(sp.get("tab") as TabKey) ? sp.get("tab") : "overview") as TabKey;
  const setTab = (t: TabKey) => { const next = new URLSearchParams(sp); next.set("tab", t); setSp(next, { replace: true }); };

  const { data: partnerId } = useQuery({
    queryKey: ["current-partner-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_partner_id" as any);
      return (data as string | null) ?? null;
    },
  });

  const { data: partners } = usePartners();
  const partner = useMemo(() => partners?.find((p) => p.id === partnerId) ?? null, [partners, partnerId]);

  const { data: attributions } = usePartnerAttributions(partnerId);
  const attributedIds = useMemo(() => new Set<string>((attributions || []).map((a: any) => a.user_id)), [attributions]);
  const { year, month } = nowYangon();
  const { data: preview } = usePartnerStatementPreview(partner as any, year, month);
  const { data: statements } = usePartnerStatements(partnerId);

  const labels: Record<TabKey, { en: string; my: string }> = {
    overview: { en: "Overview", my: "ခြုံငုံ" },
    statements: { en: "Statements", my: "ထုတ်ပြန်ချက်" },
    attributions: { en: "Attributed Users", my: "Attribution သုံးစွဲသူ" },
    referrals: { en: "Referral Codes", my: "ညွှန်းကုဒ်" },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ငွေကြေး ဗဟိုဌာန" : "Finance Hub"} />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {!partnerId ? (
          <Card className="flex items-start gap-2 border-destructive/40 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{my ? "သင့်အကောင့်ကို partner record နှင့် ချိတ်ဆက်ထားခြင်း မရှိသေးပါ။ Admin ထံ ဆက်သွယ်ပါ။" : "Your account is not linked to a partner record yet. Contact admin to link it."}</p>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="mb-4 flex w-full flex-wrap justify-start">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>{my ? labels[t].my : labels[t].en}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              {preview && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <PartnerKpi label={my ? "လက်ရှိလ Net NPR" : "MTD Net NPR"} value={fmt(preview.net_collected_attributed_npr)} />
                  <PartnerKpi label={my ? "ခန့်မှန်း ပေးချေ" : "Projected payout"} value={fmt(preview.total_payout)} tone="ok" />
                  <PartnerKpi label={my ? "Growth Tier" : "Growth Tier"} value={pct(preview.growth_tier_pct)} />
                  <PartnerKpi label={my ? "Quality Gate" : "Quality Gate"} value={preview.quality_gate_passed ? (my ? "ဖြတ်" : "Pass") : (my ? "မဖြတ်" : "Fail")} tone={preview.quality_gate_passed ? "ok" : "warn"} />
                </div>
              )}
              <FinanceOverview attributedUserIds={attributedIds} days={30} hidePlatformOnly />
            </TabsContent>

            <TabsContent value="statements">
              <Card className="divide-y">
                {(statements || []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{my ? "ထုတ်ပြန်ချက် မရှိသေးပါ။" : "No statements finalized yet."}</p>
                ) : (statements || []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-semibold">{s.period_year}/{String(s.period_month).padStart(2, "0")}</div>
                      <div className="text-xs text-muted-foreground">
                        Net NPR {fmt(s.net_collected_attributed_npr)} · Tier {pct(s.growth_tier_pct)} +{pct(s.growth_bonus_pct)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{fmt(s.total_payout)}</div>
                      <Badge variant={s.status === "paid" ? "default" : s.status === "finalized" ? "secondary" : "outline"}>{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="attributions">
              <Card className="divide-y">
                {(attributions || []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{my ? "Attribution မရှိသေးပါ။" : "No attributed users yet."}</p>
                ) : (attributions || []).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-mono text-xs">{a.user_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.channel} · {new Date(a.attributed_at).toLocaleDateString()}
                        {a.first_paid_at ? ` · ${my ? "ပထမ ပေးချေ" : "first paid"} ${new Date(a.first_paid_at).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <Badge variant={a.first_paid_at ? "default" : "secondary"}>{a.first_paid_at ? "Active" : "Pending"}</Badge>
                  </div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="referrals">
              <PartnerReferrals hideHeader />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function PartnerKpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const cls = tone === "ok" ? "border-emerald/30" : tone === "warn" ? "border-warning/30" : "border-border";
  return (
    <Card className={`p-3 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </Card>
  );
}
