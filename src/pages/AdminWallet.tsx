import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { getPaymentProofSignedUrl } from "@/hooks/use-payment";
import { formatMMK } from "@/hooks/use-wallet";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

const AdminWallet = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const qc = useQueryClient();

  const [subFilter, setSubFilter] = useState<"pending" | "all">("pending");
  const [topupFilter, setTopupFilter] = useState<"pending" | "all">("pending");

  const { data: subRequests = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["admin-sub-requests", subFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("subscription_payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (subFilter === "pending") q = q.eq("status", "pending");
      const { data: reqs } = await q;
      if (!reqs || reqs.length === 0) return [];
      const planIds = [...new Set(reqs.filter((r: any) => r.plan_id).map((r: any) => r.plan_id))];
      const addonIds = [...new Set(reqs.filter((r: any) => r.addon_id).map((r: any) => r.addon_id))];
      const [plansRes, addonsRes] = await Promise.all([
        planIds.length > 0 ? (supabase as any).from("subscription_plans").select("id,role,tier,price_mmk").in("id", planIds) : Promise.resolve({ data: [] }),
        addonIds.length > 0 ? (supabase as any).from("addon_products").select("id,key,label_en,kind,mmk,is_per_unit").in("id", addonIds) : Promise.resolve({ data: [] }),
      ]);
      const planMap = new Map((plansRes.data || []).map((p: any) => [p.id, p]));
      const addonMap = new Map((addonsRes.data || []).map((a: any) => [a.id, p]));
      return (reqs as any[]).map((r: any) => ({
        ...r,
        plan: planMap.get(r.plan_id) || null,
        addon: addonMap.get(r.addon_id) || null,
      }));
    },
  });

  // Job Seeker / Mentor wallet top-ups (still active for those roles).
  const { data: topupRequests = [], isLoading: loadingTopups } = useQuery({
    queryKey: ["admin-topup-requests", topupFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("topup_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (topupFilter === "pending") q = q.eq("status", "pending");
      const { data } = await q;
      return (data as any[]) || [];
    },
  });

  // Resolve user display name + email for every visible user_id.
  const visibleUserIds = useMemo(() => {
    const s = new Set<string>();
    (subRequests || []).forEach((r: any) => r?.user_id && s.add(r.user_id));
    (topupRequests || []).forEach((r: any) => r?.user_id && s.add(r.user_id));
    return Array.from(s);
  }, [subRequests, topupRequests]);

  const { data: userDirectory } = useQuery({
    queryKey: ["admin-wallet-user-directory", visibleUserIds.sort().join(",")],
    enabled: visibleUserIds.length > 0,
    queryFn: async () => {
      const [{ data: profs }, { data: contacts }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", visibleUserIds),
        (supabase as any).rpc("get_user_contacts_admin", { _ids: visibleUserIds }),
      ]);
      const emailMap = new Map<string, string>((contacts || []).map((c: any) => [c.id, c.email]));
      const map = new Map<string, { name: string; email: string | null }>();
      (profs || []).forEach((p: any) => map.set(p.id, { name: p.display_name || "User", email: emailMap.get(p.id) ?? null }));
      visibleUserIds.forEach((id) => { if (!map.has(id)) map.set(id, { name: "User", email: emailMap.get(id) ?? null }); });
      return map;
    },
  });

  const UserLine = ({ userId }: { userId: string }) => {
    const u = userDirectory?.get(userId);
    const name = u?.name || (my ? "သုံးစွဲသူ" : "User");
    const email = u?.email;
    const linkTo = `/admin/users${email ? `?q=${encodeURIComponent(email)}` : ""}`;
    return (
      <Link to={linkTo} className="block text-[10px] text-muted-foreground hover:text-primary hover:underline">
        <span className="font-semibold text-foreground">{name}</span>
        {email ? <span> · {email}</span> : <span> · {userId.slice(0, 8)}…</span>}
      </Link>
    );
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

  const reviewTopup = useMutation({
    mutationFn: async ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => {
      const fn = approve ? "wallet_topup_approve" : "wallet_topup_reject";
      const { error } = await (supabase as any).rpc(fn, { _topup_id: id, _admin_note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-topup-requests"] });
      qc.invalidateQueries({ queryKey: ["topup-requests"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => toast.error(e?.message || (my ? "မအောင်မြင်ပါ" : "Failed")),
  });

  const [rejectTarget, setRejectTarget] = useState<{ id: string; kind: "sub" | "topup" } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const viewProof = async (path: string) => {
    const url = await getPaymentProofSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    const note = rejectNote.trim() || (my ? "ငြင်းပယ်" : "Rejected");
    if (rejectTarget.kind === "sub") reviewSub.mutate({ id: rejectTarget.id, approve: false, note });
    else reviewTopup.mutate({ id: rejectTarget.id, approve: false, note });
    setRejectTarget(null);
    setRejectNote("");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ပိုက်ဆံအိတ် & ပေးချေမှု" : "Wallet & Payments"} showBack />
      <div className="px-5">
        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscriptions">{my ? "Package ပေးချေမှု" : "Subscriptions"}</TabsTrigger>
            <TabsTrigger value="topups">{my ? "Wallet ငွေဖြည့်" : "Wallet Top-ups"}</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-2 pt-3">
            {loadingSubs && (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!loadingSubs && subRequests.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {my ? "Package တောင်းခံမှု မရှိပါ" : "No subscription requests"}
              </p>
            )}
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
                      <UserLine userId={r.user_id} />
                      <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-2 flex gap-1.5">
                      {r.proof_url && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => viewProof(r.proof_url)}>
                          <Eye className="mr-1 h-3 w-3" />{my ? "အထောက်အထား" : "Proof"}
                        </Button>
                      )}
                      <Button size="sm" className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-700" onClick={() => reviewSub.mutate({ id: r.id, approve: true })}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />{my ? "ခွင့်ပြု" : "Approve"}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => { setRejectTarget({ id: r.id, kind: "sub" }); setRejectNote(""); }}>
                        <XCircle className="mr-1 h-3 w-3" />{my ? "ငြင်းပယ်" : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="topups" className="space-y-2 pt-3">
            {loadingTopups && (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!loadingTopups && topupRequests.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {my ? "Wallet ငွေဖြည့်တောင်းခံမှု မရှိပါ" : "No wallet top-up requests"}
              </p>
            )}
            {topupRequests.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold">{formatMMK(r.mmk_amount, lang)} <span className="text-[10px] font-normal text-muted-foreground">→ {formatMMK(r.credits_to_grant, lang)}</span></div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.payment_method?.toUpperCase()} · ref: {r.sender_reference || "—"}
                    </div>
                    <UserLine userId={r.user_id} />
                    <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                </div>
                {r.status === "pending" && (
                  <div className="mt-2 flex gap-1.5">
                    {r.proof_url && (
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => viewProof(r.proof_url)}>
                        <Eye className="mr-1 h-3 w-3" />{my ? "အထောက်အထား" : "Proof"}
                      </Button>
                    )}
                    <Button size="sm" className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-700" onClick={() => reviewTopup.mutate({ id: r.id, approve: true })}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />{my ? "ခွင့်ပြု" : "Approve"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => { setRejectTarget({ id: r.id, kind: "topup" }); setRejectNote(""); }}>
                      <XCircle className="mr-1 h-3 w-3" />{my ? "ငြင်းပယ်" : "Reject"}
                    </Button>
                  </div>
                )}
                {r.admin_note && (
                  <div className="mt-2 rounded-md bg-muted/60 p-2 text-[10px] text-muted-foreground">
                    <span className="font-semibold">{my ? "Admin မှတ်ချက်" : "Admin note"}:</span> {r.admin_note}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Reject reason modal */}
        <AnimatePresence>
          {rejectTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => { setRejectTarget(null); setRejectNote(""); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-3 text-sm font-bold text-foreground">{my ? "ငြင်းပယ်ရန် အကြောင်းပြ" : "Rejection Reason"}</h3>
                <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={my ? "အကြောင်းပြချက် ရေးပါ..." : "Enter reason..."} className="mb-4 rounded-xl text-xs" rows={3} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNote(""); }} className="flex-1 rounded-xl text-xs" size="sm">
                    {my ? "မလုပ်တော့" : "Cancel"}
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmReject} className="flex-1 rounded-xl text-xs" size="sm" disabled={reviewSub.isPending || reviewTopup.isPending}>
                    {my ? "ငြင်းပယ်" : "Reject"}
                  </Button>
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
