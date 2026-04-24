import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, DollarSign, Briefcase, GraduationCap, Crown, RotateCcw, Calendar } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  useAllPaymentRequests,
  useUpdatePaymentRequest,
  getPaymentProofSignedUrl,
  usePaymentBookingContext,
  usePaymentEmployerContext,
} from "@/hooks/use-payment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PaymentRequest } from "@/hooks/use-payment";

type FilterType = "all" | "pending" | "approved" | "rejected" | "revoked";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စစ်ဆေးရန်", en: "Pending" }, color: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: { my: "အတည်ပြုပြီး", en: "Approved" }, color: "bg-emerald/10 text-emerald", icon: CheckCircle },
  rejected: { label: { my: "ပယ်ချပြီး", en: "Rejected" }, color: "bg-destructive/10 text-destructive", icon: XCircle },
  revoked: { label: { my: "ရုပ်သိမ်းပြီး", en: "Revoked" }, color: "bg-destructive/10 text-destructive", icon: RotateCcw },
};

const methodLabels: Record<string, string> = {
  kbzpay: "KBZPay",
  wave: "WaveMoney",
  promptpay: "PromptPay",
  wise: "Wise",
  payoneer: "Payoneer",
};

const typeLabels: Record<string, { my: string; en: string; icon: typeof Crown }> = {
  subscription: { my: "အသုံးပြုသူ ပရီမီယံ", en: "User Premium", icon: Crown },
  mentor_session: { my: "Mentor Session", en: "Mentor Session", icon: GraduationCap },
  employer_subscription: { my: "အလုပ်ရှင် အစီအစဉ်", en: "Employer Plan", icon: Briefcase },
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
  const [confirmAction, setConfirmAction] = useState<"approved" | "rejected" | "revoked" | null>(null);
  const [proofImageError, setProofImageError] = useState(false);
  const [proofLoadTimeout, setProofLoadTimeout] = useState(false);

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

  // Context data for selected payment
  const { data: bookingContext } = usePaymentBookingContext(selectedPayment?.booking_id);
  const { data: employerContext } = usePaymentEmployerContext(
    selectedPayment?.user_id,
    selectedPayment?.payment_type || ""
  );

  // Mentor profile for booking context
  const { data: mentorProfile } = useQuery({
    queryKey: ["payment-mentor-profile", bookingContext?.mentor_id],
    queryFn: async () => {
      if (!bookingContext?.mentor_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", bookingContext.mentor_id)
        .maybeSingle();
      return data;
    },
    enabled: !!bookingContext?.mentor_id,
  });

  const filtered = (payments || []).filter(p => filter === "all" || p.status === filter);
  const pendingCount = (payments || []).filter(p => p.status === "pending").length;

  const fetchProofSignedUrl = async (proofUrl: string) => {
    setProofSignedUrl(null);
    setProofImageError(false);
    setProofLoadTimeout(false);

    const timeoutId = setTimeout(() => {
      setProofLoadTimeout(true);
    }, 10000);

    try {
      const url = await getPaymentProofSignedUrl(proofUrl);
      clearTimeout(timeoutId);
      setProofSignedUrl(url);
    } catch {
      clearTimeout(timeoutId);
      setProofLoadTimeout(true);
    }
  };

  // Generate signed URL when a payment with proof is selected
  useEffect(() => {
    setProofSignedUrl(null);
    setProofImageError(false);
    setProofLoadTimeout(false);
    if (selectedPayment?.proof_url) {
      fetchProofSignedUrl(selectedPayment.proof_url);
    }
  }, [selectedPayment]);

  const handleAction = async (status: "approved" | "rejected" | "revoked") => {
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
          : status === "revoked"
          ? (lang === "my" ? "ရုပ်သိမ်းပြီး" : "Payment Revoked")
          : (lang === "my" ? "ပယ်ချပြီး" : "Payment Rejected"),
      });
      setSelectedPayment(null);
      setAdminNote("");
      setConfirmAction(null);
    } catch (err: any) {
      toast({ title: lang === "my" ? "အမှား" : "Error", description: err?.message || "Failed to update payment", variant: "destructive" });
    }
  };

  const selectedPaymentProfile = selectedPayment ? profileMap.get(selectedPayment.user_id) : null;

  const filters: { id: FilterType; label: { my: string; en: string } }[] = [
    { id: "all", label: { my: "အားလုံး", en: "All" } },
    { id: "pending", label: { my: "စစ်ဆေးရန်", en: "Pending" } },
    { id: "approved", label: { my: "အတည်ပြုပြီး", en: "Approved" } },
    { id: "rejected", label: { my: "ပယ်ချပြီး", en: "Rejected" } },
    { id: "revoked", label: { my: "ရုပ်သိမ်းပြီး", en: "Revoked" } },
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
            <Clock className="mx-auto mb-1 h-5 w-5 text-warning" strokeWidth={1.5} />
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
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
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
              const tl = typeLabels[p.payment_type] || { my: p.payment_type, en: p.payment_type, icon: DollarSign };
              const TypeIcon = tl.icon;
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
                    <div className="flex items-center gap-1.5">
                      <TypeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile?.display_name || "User"}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
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

              {/* Reference / plan id */}
              {selectedPayment.reference_id && (
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အကိုးအကား" : "Reference / Plan"}</p>
                  <p className="text-sm font-mono text-foreground">{selectedPayment.reference_id}</p>
                </div>
              )}

              {/* Booking context for mentor sessions */}
              {selectedPayment.payment_type === "mentor_session" && bookingContext && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "Booking အသေးစိတ်" : "Booking Details"}
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="text-foreground"><span className="text-muted-foreground">{lang === "my" ? "Mentor:" : "Mentor:"}</span> {mentorProfile?.display_name || "—"}</p>
                    <p className="text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {bookingContext.scheduled_date} · {bookingContext.scheduled_time}
                    </p>
                    {bookingContext.topic && (
                      <p className="text-foreground"><span className="text-muted-foreground">{lang === "my" ? "ခေါင်းစဉ်:" : "Topic:"}</span> {bookingContext.topic}</p>
                    )}
                    <p className="text-foreground">
                      <span className="text-muted-foreground">{lang === "my" ? "Booking အခြေအနေ:" : "Booking status:"}</span>{" "}
                      <span className={bookingContext.status === "cancelled" || bookingContext.status === "declined" ? "text-destructive font-semibold" : ""}>
                        {bookingContext.status}
                      </span>
                    </p>
                  </div>
                  {(bookingContext.status === "cancelled" || bookingContext.status === "declined") && selectedPayment.status === "pending" && (
                    <p className="mt-2 rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                      ⚠️ {lang === "my" ? "ဤ Booking ကို ပယ်ဖျက်ထားသည်။ ငွေပေးချေမှုကို အတည်မပြုပါနှင့်။" : "This booking is cancelled. Do not approve this payment."}
                    </p>
                  )}
                </div>
              )}

              {/* Employer context */}
              {selectedPayment.payment_type === "employer_subscription" && employerContext && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === "my" ? "ကုမ္ပဏီ" : "Company"}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{employerContext.company_name || "—"}</p>
                  {employerContext.subscription_tier && (
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "my" ? "လက်ရှိ အစီအစဉ်:" : "Current tier:"} <span className="font-medium text-foreground">{employerContext.subscription_tier}</span>
                      {employerContext.subscription_expires_at && ` (${lang === "my" ? "သက်တမ်းကုန်:" : "expires"} ${new Date(employerContext.subscription_expires_at).toLocaleDateString()})`}
                    </p>
                  )}
                </div>
              )}

              {/* Proof image - using signed URL for private bucket */}
              {selectedPayment.proof_url && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{lang === "my" ? "ငွေလွှဲ အထောက်အထား" : "Payment Proof"}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 rounded-full px-2 text-[10px]"
                      onClick={() => selectedPayment.proof_url && fetchProofSignedUrl(selectedPayment.proof_url)}
                    >
                      {lang === "my" ? "လင့်ခ် ပြန်ယူ" : "Refresh link"}
                    </Button>
                  </div>
                  {proofLoadTimeout ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-4 text-center">
                      <p className="text-xs text-destructive">
                        {lang === "my" ? "ပုံ ဖွင့်၍ မရပါ။" : "Proof image could not be loaded."}
                      </p>
                    </div>
                  ) : proofImageError ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-warning/30 bg-warning/5 px-4 text-center">
                      <p className="text-xs text-warning">
                        {lang === "my"
                          ? "ပုံ ရနိုင်ခြင်း မရှိပါ သို့မဟုတ် သက်တမ်းကုန်သည်။ လျှောက်ထားသူထံမှ လင့်ခ်အသစ် တောင်းပါ။"
                          : "Proof image unavailable or expired. Request a new link from the applicant."}
                      </p>
                    </div>
                  ) : proofSignedUrl ? (
                    <img
                      src={proofSignedUrl}
                      alt="proof"
                      className="w-full rounded-xl border border-border object-contain max-h-64"
                      onError={() => setProofImageError(true)}
                    />
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

              {/* Reviewed by info */}
              {(selectedPayment.reviewed_by || selectedPayment.reviewed_at) && (
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                  {lang === "my" ? "စစ်ဆေးသူ" : "Reviewed by"}{" "}
                  <span className="font-medium text-foreground">{(selectedPayment as any).reviewed_by_name || selectedPayment.reviewed_by || "Admin"}</span>
                  {selectedPayment.reviewed_at && (
                    <> {lang === "my" ? "မှာ" : "on"}{" "}
                    <span className="font-medium text-foreground">{new Date((selectedPayment as any).reviewed_at).toLocaleDateString()}</span></>
                  )}
                </div>
              )}

              {/* Admin note */}
              {(selectedPayment.status === "pending" || selectedPayment.status === "approved") && (
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={lang === "my" ? "မှတ်ချက် (ရွေးချယ်ပိုင်ခွင့်)" : "Admin note (optional)"}
                  className="min-h-[60px] rounded-xl"
                />
              )}

              {/* Actions for pending */}
              {selectedPayment.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1 rounded-xl"
                    disabled={updatePayment.isPending}
                    onClick={() => setConfirmAction("approved")}
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    {lang === "my" ? "အတည်ပြုရန်" : "Approve"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    disabled={updatePayment.isPending || !adminNote || adminNote.trim() === ""}
                    onClick={() => setConfirmAction("rejected")}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    {lang === "my" ? "ပယ်ချရန်" : "Reject"}
                  </Button>
                </div>
              )}

              {/* Revoke action for approved payments */}
              {selectedPayment.status === "approved" && (
                <Button
                  variant="destructive"
                  className="w-full rounded-xl"
                  disabled={updatePayment.isPending}
                  onClick={() => setConfirmAction("revoked")}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  {lang === "my" ? "အတည်ပြုမှုကို ရုပ်သိမ်းရန်" : "Revoke / Refund"}
                </Button>
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

      {/* Confirmation AlertDialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approved"
                ? (lang === "my" ? "ငွေပေးချေမှု အတည်ပြုမည်" : "Approve Payment")
                : confirmAction === "revoked"
                ? (lang === "my" ? "ငွေပေးချေမှု ရုပ်သိမ်းမည်" : "Revoke Payment")
                : (lang === "my" ? "ငွေပေးချေမှု ပယ်ချမည်" : "Reject Payment")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                {selectedPayment && (
                  <>
                    <p><span className="font-medium">{lang === "my" ? "ပမာဏ" : "Amount"}:</span> {selectedPayment.currency === "MMK" ? `${selectedPayment.amount.toLocaleString()} ကျပ်` : `$${selectedPayment.amount}`}</p>
                    <p><span className="font-medium">{lang === "my" ? "အသုံးပြုသူ" : "User"}:</span> {selectedPaymentProfile?.display_name || "—"}</p>
                    <p><span className="font-medium">{lang === "my" ? "ပေးချေနည်း" : "Method"}:</span> {methodLabels[selectedPayment.payment_method] || selectedPayment.payment_method}</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              {lang === "my" ? "မလုပ်တော့" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleAction(confirmAction)}
              className={confirmAction !== "approved" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {lang === "my" ? "အတည်ပြုရန်" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPayments;
