import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { getPaymentProofSignedUrl } from "@/hooks/use-payment";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

type Tab = "subscriptions" | "topups" | "adjust";
const TABS: Tab[] = ["subscriptions", "topups", "adjust"];

const AdminWallet = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (TABS as readonly string[]).includes(searchParams.get("tab") || "")
    ? (searchParams.get("tab") as Tab)
    : "subscriptions";
  const [tab, setTabState] = useState<Tab>(initialTab);
  const setTab = (next: Tab) => {
    setTabState(next);
    const p = new URLSearchParams(searchParams);
    if (next === "subscriptions") p.delete("tab"); else p.set("tab", next);
    setSearchParams(p, { replace: true });
  };
  useEffect(() => {
    const urlT = searchParams.get("tab");
    const valid = (TABS as readonly string[]).includes(urlT || "") ? (urlT as Tab) : "subscriptions";
    if (valid !== tab) setTabState(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const topupStatusFilter = searchParams.get("status");

  const tabLabels: Record<Tab, { en: string; my: string }> = {
    subscriptions: { en: "Subscriptions & Add-ons", my: "Package" },
    topups: { en: "Top-ups (legacy)", my: "ငွေဖြည့် (ယခင်)" },
    adjust: { en: "Manual Adjust", my: "ပြင်ဆင်" },
  };

  const { data: subRequests = [] } = useQuery({
    queryKey: ["admin-sub-requests"],
    queryFn: async () => {
      const { data: reqs } = await (supabase as any)
        .from("subscription_payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!reqs || reqs.length === 0) return [];
      const planIds = [...new Set(reqs.filter((r: any) => r.plan_id).map((r: any) => r.plan_id))];
      const addonIds = [...new Set(reqs.filter((r: any) => r.addon_id).map((r: any) => r.addon_id))];
      const [plansRes, addonsRes] = await Promise.all([
        planIds.length > 0 ? (supabase as any).from("subscription_plans").select("id,role,tier,price_mmk").in("id", planIds) : Promise.resolve({ data: [] }),
        addonIds.length > 0 ? (supabase as any).from("addon_products").select("id,key,label_en,kind,mmk,is_per_unit").in("id", addonIds) : Promise.resolve({ data: [] }),
      ]);
      const planMap = new Map((plansRes.data || []).map((p: any) => [p.id, p]));
      const addonMap = new Map((addonsRes.data || []).map((a: any) => [a.id, a]));
      return (reqs as any[]).map((r: any) => ({
        ...r,
        plan: planMap.get(r.plan_id) || null,
        addon: addonMap.get(r.addon_id) || null,
      }));
    },
  });

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
    onError: (e: any) => toast.error(e?.message || (my ? "မအောင်မြင်ပါ" : "Failed")),
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
    onSuccess: () => toast.success(my ? "ပြင်ဆင်ပြီး" : "Adjusted"),
    onError: (e: any) => toast.error(e?.message || (my ? "မအောင်မြင်ပါ" : "Failed")),
  });

  const [adjustUser, setAdjustUser] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  // Rejection dialog state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: "sub" | "topup" } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const viewProof = async (path: string) => {
    const url = await getPaymentProofSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    const note = rejectNote.trim() || (my ? "ငြင်းပယ်" : "Rejected");
    if (rejectTarget.type === "sub") {
      reviewSub.mutate({ id: rejectTarget.id, approve: false, note });
    } else {
      review.mutate({ id: rejectTarget.id, approve: false, note });
    }
    setRejectTarget(null);
    setRejectNote("");
  };

  const reviewSub = useMutation({
    mutationFn: async ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => {
      const fn = approve ? "approve_subscription_payment" : "reject_subscription_payment";
      const { error } = await (supabase as any).rpc(fn, { p_request_id: id, p_admin_note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sub-requests"] });
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      qc.invalidateQueries({ queryKey: ["my-quotas"] });
      qc.invalidateQueries({ queryKey: ["my-sub-payment-requests"] });
    },
    onError: (e: any) => toast.error(e?.message || (my ? "မအောင်မြင်ပါ" : "Failed")),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ပိုက်ဆံအိတ် စီမံ" : "Wallet Admin"} showBack />
      <div className="px-5">
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {my ? tabLabels[t].my : tabLabels[t].en}
            </button>
          ))}
        </div>

        {tab === "subscriptions" && (
          <div className="space-y-2">
            {subRequests.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">{my ? "Package တောင်းခံမှု မရှိပါ" : "No subscription requests"}</p>}
            {subRequests.map((r: any) => {
              const isSub = r.request_type === "subscription";
              const title = isSub
                ? `Package · ${r.plan?.tier?.toUpperCase()}`
                : `${r.addon?.label_en || "Add-on"}${r.quantity > 1 ? ` × ${r.quantity}` : ""}`;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-bold">{title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.mmk_amount?.toLocaleString()} Ks · {r.payment_method?.toUpperCase()} · ref: {r.sender_reference || "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{my ? "သုံးစွဲသူ" : "user"}: {r.user_id?.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-2 flex gap-1.5">
                      {r.proof_url && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => viewProof(r.proof_url)}><Eye className="mr-1 h-3 w-3" />{my ? "အထောက်အထား" : "Proof"}</Button>}
                      <Button size="sm" className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-700" onClick={() => reviewSub.mutate({ id: r.id, approve: true })}><CheckCircle2 className="mr-1 h-3 w-3" />{my ? "ခွင့်ပြု" : "Approve"}</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => { setRejectTarget({ id: r.id, type: "sub" }); setRejectNote(""); }}><XCircle className="mr-1 h-3 w-3" />{my ? "ငြင်းပယ်" : "Reject"}</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "topups" && (
          <div className="space-y-2">
            {topupStatusFilter && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px]">
                <span className="text-muted-foreground">{my ? "စစ်ထုတ်: " : "Filter: "}<span className="font-semibold text-foreground capitalize">{topupStatusFilter}</span></span>
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("status"); setSearchParams(p, { replace: true }); }} className="font-semibold text-primary">{my ? "ရှင်းရန်" : "Clear"}</button>
              </div>
            )}
            {(topupStatusFilter ? topups.filter((t: any) => t.status === topupStatusFilter) : topups).length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">{my ? "ငွေဖြည့်တောင်းခံမှု မရှိပါ" : "No top-ups"}</p>}
            {(topupStatusFilter ? topups.filter((t: any) => t.status === topupStatusFilter) : topups).map((t: any) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{t.mmk_amount.toLocaleString()} Ks → {t.credits_to_grant.toLocaleString()} Ks</div>
                    <div className="text-[10px] text-muted-foreground">{t.payment_method.toUpperCase()} · {my ? "ref" : "ref"}: {t.sender_reference || "—"} · {new Date(t.created_at).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">{my ? "သုံးစွဲသူ" : "user"}: {t.user_id.slice(0, 8)}…</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${t.status === "approved" ? "bg-emerald-100 text-emerald-700" : t.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{t.status}</span>
                </div>
                {t.status === "pending" && (
                  <div className="mt-2 flex gap-1.5">
                    {t.proof_url && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => viewProof(t.proof_url)}><Eye className="mr-1 h-3 w-3" />{my ? "အထောက်အထား" : "Proof"}</Button>}
                    <Button size="sm" className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-700" onClick={() => review.mutate({ id: t.id, approve: true })}><CheckCircle2 className="mr-1 h-3 w-3" />{my ? "ခွင့်ပြု" : "Approve"}</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => { setRejectTarget({ id: t.id, type: "topup" }); setRejectNote(""); }}><XCircle className="mr-1 h-3 w-3" />{my ? "ငြင်းပယ်" : "Reject"}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "adjust" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{my ? "သုံးစွဲသူ၏ ပိုက်ဆံအိတ်ကို ကိုယ်တိုင် ဖြည့်/နုတ်ပါ (နုတ်ရန် အနုတ်လက္ခဏာဖြင့် ထည့်ပါ)။" : "Manually credit or debit a user's wallet (use negative for debit)."}</p>
            <Input placeholder={my ? "သုံးစွဲသူ UUID" : "User UUID"} value={adjustUser} onChange={(e) => setAdjustUser(e.target.value)} className="h-9 text-xs" />
            <Input placeholder={my ? "ပမာဏ Ks (ဥပမာ 1000 သို့ -500)" : "Delta Ks (e.g. 1000 or -500)"} value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="h-9 text-xs" type="number" />
            <Textarea placeholder={my ? "အကြောင်းပြချက် / မှတ်ချက်" : "Reason / note"} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="text-xs" />
            <Button className="w-full" disabled={!adjustUser || !adjustDelta || !adjustNote} onClick={() => adjust.mutate({ user_id: adjustUser, delta: Number(adjustDelta), note: adjustNote })}>
              {my ? "ပြင်ဆင်မှု လုပ်ဆောင်ရန်" : "Apply adjustment"}
            </Button>
          </div>
        )}

        {/* Reject reason modal */}
        <AnimatePresence>
          {rejectTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => { setRejectTarget(null); setRejectNote(""); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-3 text-sm font-bold text-foreground">{my ? "ငြင်းပယ်ရန် အကြောင်းပြ" : "Rejection Reason"}</h3>
                <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={my ? "အကြောင်းပြချက် ရေးပါ..." : "Enter reason..."} className="mb-4 rounded-xl text-xs" rows={3} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNote(""); }} className="flex-1 rounded-xl text-xs" size="sm">{my ? "မလုပ်တော့" : "Cancel"}</Button>
                  <Button variant="destructive" onClick={handleConfirmReject} className="flex-1 rounded-xl text-xs" size="sm" disabled={reviewSub.isPending || review.isPending}>{my ? "ငြင်းပယ်" : "Reject"}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminWallet;
