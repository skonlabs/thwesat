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
import {
  usePartners,
  usePartnerAttributions,
  usePartnerStatements,
  usePartnerStatementPreview,
  usePartnerQualityMetrics,
  useFinalizeStatement,
  usePaymentReversals,
  type Partner,
} from "@/hooks/use-partner-finance";

const fmt = (n: number) => `${Math.round(Number(n || 0)).toLocaleString()} MMK`;
const pct = (n: number) => `${(Number(n || 0) * 100).toFixed(1)}%`;

const now = new Date();

export default function AdminPartnerFinance() {
  const { data: partners, isLoading: loadingPartners } = usePartners();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [year, setYear] = useState<number>(now.getUTCFullYear());
  const [month, setMonth] = useState<number>(now.getUTCMonth() + 1);

  const partner = useMemo<Partner | null>(
    () => partners?.find((p) => p.id === selectedId) ?? partners?.[0] ?? null,
    [partners, selectedId],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Partner Finance" showBack />
      <div className="mx-auto max-w-6xl space-y-4 px-5 md:px-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs">Partner</Label>
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
              <p className="text-sm text-muted-foreground">No partners yet.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NewPartnerSheet />
        </div>

        {partner ? (
          <Tabs defaultValue="statement">
            <TabsList>
              <TabsTrigger value="statement">Monthly Statement</TabsTrigger>
              <TabsTrigger value="attributions">Attributions</TabsTrigger>
              <TabsTrigger value="quality">Quality Gate</TabsTrigger>
              <TabsTrigger value="reversals">Reversals</TabsTrigger>
              <TabsTrigger value="history">Statement History</TabsTrigger>
            </TabsList>

            <TabsContent value="statement"><StatementTab partner={partner} year={year} month={month} /></TabsContent>
            <TabsContent value="attributions"><AttributionsTab partner={partner} /></TabsContent>
            <TabsContent value="quality"><QualityTab partner={partner} year={year} month={month} /></TabsContent>
            <TabsContent value="reversals"><ReversalsTab /></TabsContent>
            <TabsContent value="history"><HistoryTab partner={partner} /></TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Add your first partner to begin computing revenue-share statements.
          </Card>
        )}
      </div>
    </div>
  );
}

// ───────────── Statement tab ─────────────
function StatementTab({ partner, year, month }: { partner: Partner; year: number; month: number }) {
  const { data, isLoading } = usePartnerStatementPreview(partner, year, month);
  const finalize = useFinalizeStatement();

  if (isLoading || !data) return <Card className="p-8 text-sm text-muted-foreground">Computing…</Card>;

  const blockers: string[] = [];
  if (!data.quality_gate_passed) blockers.push("Quality gate failed (need L1≥90%, CSAT≥4.0, Disputes≤1%, Fraud≤0.5%).");
  if (!data.active_growth_requirement_met) blockers.push(`Active Growth requirement not met (Growth share = ${pct(data.active_growth_ratio)}, need ≥25%).`);
  if (data.growth_npr >= 80_000_000) blockers.push("Growth NPR ≥ 80M MMK — manual tier approval required for 30% rate.");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Gross Attributed NPR" value={fmt(data.gross_attributed_npr)} />
        <Stat label="Reversals" value={fmt(data.reversals_npr)} tone="warn" />
        <Stat label="Net Collected NPR" value={fmt(data.net_collected_attributed_npr)} />
        <Stat label="Total Payout" value={fmt(data.total_payout)} tone="ok" />
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Buckets</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Row k="Growth NPR (≤12mo)" v={fmt(data.growth_npr)} />
          <Row k="Maintenance Y2 (13-24mo)" v={fmt(data.maintenance_y2_npr)} />
          <Row k="Maintenance Y3+ (25mo+)" v={fmt(data.maintenance_y3_npr)} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Tier & Bonus</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Row k="Growth Tier" v={pct(data.growth_tier_pct)} />
          <Row k="MoM Growth" v={pct(data.mom_growth_pct)} />
          <Row k="Growth Bonus" v={`+${pct(data.growth_bonus_pct)}`} />
          <Row k="Active Growth Ratio" v={pct(data.active_growth_ratio)} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Payout Breakdown</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Row k="Growth Payout" v={fmt(data.growth_payout)} />
          <Row k="Maintenance Payout" v={fmt(data.maintenance_payout)} />
          <Row k="Bonus Payout" v={fmt(data.bonus_payout)} />
          <Row k={`Capped at ${pct(partner.payout_cap_pct)}`} v={data.cap_applied ? "Yes" : "No"} />
        </div>
      </Card>

      {blockers.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" /> Blockers
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
              toast.success("Statement finalized");
            } catch (e: any) { toast.error(e.message || "Failed"); }
          }}
        >
          <Check className="mr-2 h-4 w-4" /> Finalize statement
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
function AttributionsTab({ partner }: { partner: Partner }) {
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
      toast.success("Attribution added");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Add attribution</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[260px]">
            <Label className="text-xs">User ID (UUID)</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="auth user id" />
          </div>
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" /> Attribute</Button>
        </div>
      </Card>

      <Card className="divide-y">
        {isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          : !data || data.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No attributions yet.</div>
          : data.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-mono text-xs">{a.user_id}</div>
                <div className="text-xs text-muted-foreground">
                  {a.channel} · attributed {new Date(a.attributed_at).toLocaleDateString()}
                  {a.first_paid_at ? ` · first paid ${new Date(a.first_paid_at).toLocaleDateString()}` : " · no paid txn yet"}
                </div>
              </div>
              <Badge variant={a.first_paid_at ? "default" : "secondary"}>{a.first_paid_at ? "Active" : "Pending"}</Badge>
            </div>
          ))}
      </Card>
    </div>
  );
}

// ───────────── Quality tab ─────────────
function QualityTab({ partner, year, month }: { partner: Partner; year: number; month: number }) {
  const { data, refetch } = usePartnerQualityMetrics(partner.id);
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
      toast.success("Quality metrics saved");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-sm font-semibold">Quality metrics — {year}/{String(month).padStart(2, "0")}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <NumField label="L1 SLA % (≥90)" value={vals.l1_sla_pct} onChange={(v) => setVals({ ...vals, l1_sla_pct: v })} />
        <NumField label="CSAT (≥4.0)" value={vals.csat_score} onChange={(v) => setVals({ ...vals, csat_score: v })} />
        <NumField label="Dispute % (≤1)" value={vals.dispute_rate_pct} onChange={(v) => setVals({ ...vals, dispute_rate_pct: v })} />
        <NumField label="Fraud % (≤0.5)" value={vals.fraud_rate_pct} onChange={(v) => setVals({ ...vals, fraud_rate_pct: v })} />
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Input value={vals.notes} onChange={(e) => setVals({ ...vals, notes: e.target.value })} />
      </div>
      <Button onClick={save} disabled={busy}>Save metrics</Button>
    </Card>
  );
}
function NumField({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ───────────── Reversals tab ─────────────
function ReversalsTab() {
  const { data, isLoading, refetch } = usePaymentReversals();
  const [paymentId, setPaymentId] = useState("");
  const [type, setType] = useState("refund");
  const [amount, setAmount] = useState("");
  const [npr, setNpr] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.success("Reversal recorded");
      setPaymentId(""); setAmount(""); setNpr(""); setReason("");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Record reversal / clawback</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">Payment ID</Label>
            <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="payment_requests.id" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["refund", "chargeback", "reversal", "unpaid", "fraud_writeoff"].map((t) =>
                  <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">NPR (optional)</Label>
            <Input type="number" value={npr} onChange={(e) => setNpr(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" /> Record</Button>
      </Card>

      <Card className="divide-y">
        {isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          : !data || data.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No reversals.</div>
          : data.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">{r.reversal_type} · {fmt(r.amount)}{r.npr_amount ? ` (NPR ${fmt(r.npr_amount)})` : ""}</div>
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
function HistoryTab({ partner }: { partner: Partner }) {
  const { data, isLoading } = usePartnerStatements(partner.id);
  if (isLoading) return <Card className="p-4 text-sm">Loading…</Card>;
  if (!data || data.length === 0) return <Card className="p-4 text-sm text-muted-foreground">No statements yet.</Card>;
  return (
    <Card className="divide-y">
      {data.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-semibold">{s.period_year}/{String(s.period_month).padStart(2, "0")}</div>
            <div className="text-xs text-muted-foreground">
              Net NPR {fmt(s.net_collected_attributed_npr)} · Tier {pct(s.growth_tier_pct)} +{pct(s.growth_bonus_pct)} ·
              {s.cap_applied ? " capped" : " uncapped"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">{fmt(s.total_payout)}</div>
            <Badge variant={s.status === "paid" ? "default" : s.status === "finalized" ? "secondary" : "outline"}>
              {s.status}
            </Badge>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ───────────── New partner sheet ─────────────
function NewPartnerSheet() {
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
      toast.success("Partner created");
      qc.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false); setName(""); setCode("");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> New partner</Button></SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>New partner</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
          <div><Label className="text-xs">Contract start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <Button onClick={submit} disabled={busy} className="w-full">Create</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
