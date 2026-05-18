import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { getPaymentProofSignedUrl } from "@/hooks/use-payment";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

const AdminWallet = () => {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (["topups","adjust","prices","packages"] as const).includes(searchParams.get("tab") as any)
    ? (searchParams.get("tab") as "topups" | "adjust" | "prices" | "packages")
    : "topups";
  const [tab, setTabState] = useState<"topups" | "adjust" | "prices" | "packages">(initialTab);
  const setTab = (next: "topups" | "adjust" | "prices" | "packages") => {
    setTabState(next);
    const p = new URLSearchParams(searchParams);
    if (next === "topups") p.delete("tab"); else p.set("tab", next);
    setSearchParams(p, { replace: true });
  };
  useEffect(() => {
    const urlT = searchParams.get("tab");
    const valid = (["topups","adjust","prices","packages"] as const).includes(urlT as any) ? urlT as any : "topups";
    if (valid !== tab) setTabState(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const topupStatusFilter = searchParams.get("status"); // optional pending|approved|rejected

  const { data: topups = [] } = useQuery({
    queryKey: ["admin-topups"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("topup_requests").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: prices = [] } = useQuery({
    queryKey: ["admin-action-prices"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("action_prices").select("*").order("action_key");
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("credit_packages").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => {
      const { data: tr } = await (supabase as any)
        .from("topup_requests")
        .select("user_id, credits_to_grant, mmk_amount")
        .eq("id", id)
        .maybeSingle();
      const fn = approve ? "wallet_topup_approve" : "wallet_topup_reject";
      const { error } = await (supabase as any).rpc(fn, { _topup_id: id, _admin_note: note ?? null });
      if (error) throw error;
      if (tr) {
        const { sendAppEmail } = await import("@/lib/send-app-email");
        if (approve) {
          sendAppEmail({
            templateName: "topup-approved",
            recipientUserId: tr.user_id,
            idempotencyKey: `topup-approved-${id}`,
            templateData: {
              credits: tr.credits_to_grant?.toLocaleString?.() ?? tr.credits_to_grant,
              mmkAmount: tr.mmk_amount?.toLocaleString?.() ?? tr.mmk_amount,
            },
          });
        } else {
          sendAppEmail({
            templateName: "payment-rejected",
            recipientUserId: tr.user_id,
            idempotencyKey: `topup-rejected-${id}`,
            templateData: { reason: note, paymentType: "topup", linkPath: "/wallet" },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-topups"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ key, price }: { key: string; price: number }) => {
      const { error } = await (supabase as any).from("action_prices").update({ price_credits: price }).eq("action_key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-action-prices"] }),
  });

  const adjust = useMutation({
    mutationFn: async ({ user_id, delta, note }: { user_id: string; delta: number; note: string }) => {
      const { error } = await (supabase as any).rpc("wallet_adjust", { _user_id: user_id, _delta: delta, _note: note });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Adjusted"),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const [adjustUser, setAdjustUser] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const viewProof = async (path: string) => {
    const url = await getPaymentProofSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပိုက်ဆံအိတ် စီမံ" : "Wallet Admin"} showBack />
      <div className="px-5">
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {(["topups", "adjust", "prices", "packages"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "topups" && (
          <div className="space-y-2">
            {topupStatusFilter && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px]">
                <span className="text-muted-foreground">Filter: <span className="font-semibold text-foreground capitalize">{topupStatusFilter}</span></span>
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("status"); setSearchParams(p, { replace: true }); }} className="font-semibold text-primary">Clear</button>
              </div>
            )}
            {(topupStatusFilter ? topups.filter((t: any) => t.status === topupStatusFilter) : topups).length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No top-ups</p>}
            {(topupStatusFilter ? topups.filter((t: any) => t.status === topupStatusFilter) : topups).map((t: any) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{t.mmk_amount.toLocaleString()} Ks → {t.credits_to_grant.toLocaleString()} Ks</div>
                    <div className="text-[10px] text-muted-foreground">{t.payment_method.toUpperCase()} · ref: {t.sender_reference || "—"} · {new Date(t.created_at).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">user: {t.user_id.slice(0, 8)}…</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${t.status === "approved" ? "bg-emerald-100 text-emerald-700" : t.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{t.status}</span>
                </div>
                {t.status === "pending" && (
                  <div className="mt-2 flex gap-1.5">
                    {t.proof_url && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => viewProof(t.proof_url)}><Eye className="mr-1 h-3 w-3" />Proof</Button>}
                    <Button size="sm" className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-700" onClick={() => review.mutate({ id: t.id, approve: true })}><CheckCircle2 className="mr-1 h-3 w-3" />Approve</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => { const note = prompt("Reject reason?") || "Rejected"; review.mutate({ id: t.id, approve: false, note }); }}><XCircle className="mr-1 h-3 w-3" />Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "adjust" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Manually credit or debit a user's wallet (use negative for debit).</p>
            <Input placeholder="User UUID" value={adjustUser} onChange={(e) => setAdjustUser(e.target.value)} className="h-9 text-xs" />
            <Input placeholder="Delta Ks (e.g. 1000 or -500)" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="h-9 text-xs" type="number" />
            <Textarea placeholder="Reason / note" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="text-xs" />
            <Button className="w-full" disabled={!adjustUser || !adjustDelta || !adjustNote} onClick={() => adjust.mutate({ user_id: adjustUser, delta: Number(adjustDelta), note: adjustNote })}>
              Apply adjustment
            </Button>
          </div>
        )}

        {tab === "prices" && (
          <div className="space-y-2">
            {prices.map((p: any) => (
              <div key={p.action_key} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold">{p.label_en}</div>
                    <div className="text-[10px] text-muted-foreground">{p.action_key} · {p.duration_days ? `${p.duration_days}d` : "one-time"}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" defaultValue={p.price_credits} className="h-8 w-24 text-xs" onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== p.price_credits) updatePrice.mutate({ key: p.action_key, price: v });
                    }} />
                    <span className="text-[10px] text-muted-foreground">Ks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "packages" && (
          <div className="space-y-2">
            {packages.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="font-bold">{p.name_en}</div>
                <div className="text-[10px] text-muted-foreground">{p.price_mmk.toLocaleString()} Ks → {p.credits.toLocaleString()} Ks + {p.bonus_credits.toLocaleString()} Ks bonus</div>
              </div>
            ))}
            <p className="pt-2 text-[10px] text-muted-foreground">Edit packages via the SQL editor for now.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWallet;
