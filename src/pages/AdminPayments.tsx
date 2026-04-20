import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAllPaymentRequests, useUpdatePaymentRequest, getPaymentProofSignedUrl } from "@/hooks/use-payment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PaymentRequest } from "@/hooks/use-payment";

type FilterType = "all" | "pending" | "approved" | "rejected";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စစ်ဆေးရန်", en: "Pending" }, color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  approved: { label: { my: "အတည်ပြုပြီး", en: "Approved" }, color: "bg-emerald/10 text-emerald", icon: CheckCircle },
  rejected: { label: { my: "ပယ်ချပြီး", en: "Rejected" }, color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const methodLabels: Record<string, string> = {
  kbzpay: "KBZPay",
  wave: "WaveMoney",
  promptpay: "PromptPay",
};

const typeLabels: Record<string, { my: string; en: string }> = {
  subscription: { my: "အသုံးပြုသူ ပရီမီယံ", en: "User Premium" },
  mentor_session: { my: "Mentor Session", en: "Mentor Session" },
  employer_subscription: { my: "အလုပ်ရှင် အစီအစဉ်", en: "Employer Plan" },
};

const AdminPayments = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data: payments, isLoading } = useAllPaymentRequests();
  const updatePayment = useUpdatePaymentRequest();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);

  // Fetch user profiles for display
  const userIds = [...new Set((payments || []).map(p => p.user_id))];
  const { data: profiles } = useQuery({
    queryKey: ["payment-user-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url")
        .in("id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  const filtered = (payments || []).filter(p => filter === "all" || p.status === filter);
  const pendingCount = (payments || []).filter(p => p.status === "pending").length;

  // Generate signed URL when a payment with proof is selected
  useEffect(() => {
    setProofSignedUrl(null);
    if (selectedPayment?.proof_url) {
      getPaymentProofSignedUrl(selectedPayment.proof_url).then(url => {
        setProofSignedUrl(url);
      });
    }
  }, [selectedPayment]);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selectedPayment) return;
    try {
      await updatePayment.mutateAsync({
        id: selectedPayment.id,
        status,
        admin_note: adminNote,
      });
      toast({
        title: status === "approved"
          ? (lang === "my" ? "အတည်ပြုပြီး" : "Payment Approved Successfully")
          : (lang === "my" ? "ပယ်ချပြီး" : "Payment Rejected"),
      });
      setSelectedPayment(null);
      setAdminNote("");
    } catch (err: any) {
      toast({ title: lang === "my" ? "အမှား" : "Error", description: err?.message || "Failed to update payment", variant: "destructive" });
    }
  };

  const filters: { id: FilterType; label: { my: string; en: string } }[] = [
    { id: "all", label: { my: "အားလုံး", en: "All" } },
    { id: "pending", label: { my: "စစ်ဆေးရန်", en: "Pending" } },
    { id: "approved", label: { my: "အတည်ပြုပြီး", en: "Approved" } },
    { id: "rejected", label: { my: "ပယ်ချပြီး", en: "Rejected" } },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေပေးချေမှု စီမံခန့်ခွဲမှု" : "Payment Management"} />
      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <button onClick={() => setFilter("all")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "all" ? "border-primary" : "border-border"}`}>
            <DollarSign className="mx-auto mb-1 h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{payments?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စုစုပေါင်း" : "Total"}</p>
          </button>
          <button onClick={() => setFilter("pending")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "pending" ? "border-primary" : "border-border"}`}>
            <Clock className="mx-auto mb-1 h-5 w-5 text-yellow-600" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စစ်ဆေးရန်" : "Pending"}</p>
          </button>
          <button onClick={() => setFilter("approved")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "approved" ? "border-primary" : "border-border"}`}>
            <CheckCircle className="mx-auto mb-1 h-5 w-5 text-emerald" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{(payments || []).filter(p => p.status === "approved").length}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အတည်ပြုပြီး" : "Approved"}</p>
          </button>
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {lang === "my" ? f.label.my : f.label.en}
              {f.id === "pending" && pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 text-[9px] text-destructive-foreground">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Payment list */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="mb-2 h-20 w-full rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="mt-10 text-center">
            <DollarSign className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{lang === "my" ? "ငွေပေးချေမှု မရှိပါ" : "No payments found"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p, i) => {
              const sc = statusConfig[p.status] || statusConfig.pending;
              const profile = profileMap.get(p.user_id);
              const tl = typeLabels[p.payment_type] || { my: p.payment_type, en: p.payment_type };
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { setSelectedPayment(p); setAdminNote(p.admin_note || ""); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:bg-muted/30"
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${sc.color}`}>
                    <sc.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {methodLabels[p.payment_method] || p.payment_method} · {lang === "my" ? tl.my : tl.en}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {p.currency === "MMK" ? `${p.amount.toLocaleString()} ကျပ်` : `$${p.amount}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedPayment} onOpenChange={(v) => { if (!v) setSelectedPayment(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              {lang === "my" ? "ငွေပေးချေမှု အသေးစိတ်" : "Payment Details"}
            </SheetTitle>
          </SheetHeader>
          {selectedPayment && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပေးချေနည်း" : "Method"}</p>
                  <p className="text-sm font-semibold text-foreground">{methodLabels[selectedPayment.payment_method]}</p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပမာဏ" : "Amount"}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPayment.currency === "MMK" ? `${selectedPayment.amount.toLocaleString()} ကျပ်` : `$${selectedPayment.amount}`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အမျိုးအစား" : "Type"}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {lang === "my" ? (typeLabels[selectedPayment.payment_type]?.my || selectedPayment.payment_type) : (typeLabels[selectedPayment.payment_type]?.en || selectedPayment.payment_type)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အခြေအနေ" : "Status"}</p>
                  <p className={`text-sm font-semibold ${statusConfig[selectedPayment.status]?.color?.split(" ")[1] || "text-foreground"}`}>
                    {lang === "my" ? statusConfig[selectedPayment.status]?.label.my : statusConfig[selectedPayment.status]?.label.en}
                  </p>
                </div>
              </div>

              {/* Proof image - using signed URL for private bucket */}
              {selectedPayment.proof_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-foreground">{lang === "my" ? "ငွေလွှဲ အထောက်အထား" : "Payment Proof"}</p>
                  {proofSignedUrl ? (
                    <img src={proofSignedUrl} alt="proof" className="w-full rounded-xl border border-border object-contain max-h-64" />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-muted">
                      <p className="text-xs text-muted-foreground">{lang === "my" ? "ပုံ ဖွင့်နေသည်..." : "Loading proof..."}</p>
                    </div>
                  )}
                </div>
              )}

              {/* User info */}
              {profileMap.get(selectedPayment.user_id) && (
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အသုံးပြုသူ" : "User"}</p>
                  <p className="text-sm font-semibold text-foreground">{profileMap.get(selectedPayment.user_id)?.display_name}</p>
                  <p className="text-[10px] text-muted-foreground">{profileMap.get(selectedPayment.user_id)?.email}</p>
                </div>
              )}

              {/* Admin note + actions for pending */}
              {selectedPayment.status === "pending" && (
                <>
                  <Textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder={lang === "my" ? "မှတ်ချက် (ရွေးချယ်ပိုင်ခွင့်)" : "Admin note (optional)"}
                    className="min-h-[60px] rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 rounded-xl"
                      disabled={updatePayment.isPending}
                      onClick={() => handleAction("approved")}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      {lang === "my" ? "အတည်ပြုရန်" : "Approve"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      disabled={updatePayment.isPending}
                      onClick={() => handleAction("rejected")}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      {lang === "my" ? "ပယ်ချရန်" : "Reject"}
                    </Button>
                  </div>
                </>
              )}

              {selectedPayment.admin_note && selectedPayment.status !== "pending" && (
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "Admin မှတ်ချက်" : "Admin Note"}</p>
                  <p className="text-xs text-foreground">{selectedPayment.admin_note}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminPayments;
