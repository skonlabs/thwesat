import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, RotateCcw, Crown, Briefcase, GraduationCap, DollarSign } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useMyPaymentRequests, getPaymentProofSignedUrl, type PaymentRequest } from "@/hooks/use-payment";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  pending: { label: { my: "စစ်ဆေးနေသည်", en: "Pending" }, color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  approved: { label: { my: "အတည်ပြုပြီး", en: "Approved" }, color: "bg-emerald/10 text-emerald", icon: CheckCircle },
  rejected: { label: { my: "ပယ်ချပြီး", en: "Rejected" }, color: "bg-destructive/10 text-destructive", icon: XCircle },
  revoked: { label: { my: "ရုပ်သိမ်းပြီး", en: "Revoked" }, color: "bg-destructive/10 text-destructive", icon: RotateCcw },
};

const typeMeta: Record<string, { label: { my: string; en: string }; icon: typeof Crown }> = {
  subscription: { label: { my: "ပရီမီယံ စာရင်းသွင်းခြင်း", en: "Premium Subscription" }, icon: Crown },
  employer_subscription: { label: { my: "အလုပ်ရှင် အစီအစဉ်", en: "Employer Plan" }, icon: Briefcase },
  mentor_session: { label: { my: "Mentor Session", en: "Mentor Session" }, icon: GraduationCap },
};

const methodLabels: Record<string, string> = {
  kbzpay: "KBZPay",
  wave: "WaveMoney",
  promptpay: "PromptPay",
  wise: "Wise",
  payoneer: "Payoneer",
};

const PaymentHistory = () => {
  const { lang } = useLanguage();
  const { data: payments, isLoading } = useMyPaymentRequests();
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    setProofUrl(null);
    if (selected?.proof_url) {
      getPaymentProofSignedUrl(selected.proof_url).then(setProofUrl);
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေပေးချေမှု မှတ်တမ်း" : "Payment History"} showBack />
      <div className="px-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-20 w-full rounded-xl" />
          ))
        ) : !payments || payments.length === 0 ? (
          <div className="mt-16 text-center">
            <DollarSign className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              {lang === "my" ? "ငွေပေးချေမှု မှတ်တမ်း မရှိသေးပါ" : "No payment history yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p, i) => {
              const sc = statusConfig[p.status] || statusConfig.pending;
              const tm = typeMeta[p.payment_type] || { label: { my: p.payment_type, en: p.payment_type }, icon: DollarSign };
              const TypeIcon = tm.icon;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:bg-muted/30"
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${sc.color}`}>
                    <sc.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <TypeIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                      <p className="truncate text-sm font-semibold text-foreground">
                        {lang === "my" ? tm.label.my : tm.label.en}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {methodLabels[p.payment_method] || p.payment_method} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {p.currency === "MMK" ? `${p.amount.toLocaleString()} ကျပ်` : `$${p.amount}`}
                    </p>
                    <p className={`text-[10px] font-medium ${sc.color.split(" ")[1]}`}>
                      {lang === "my" ? sc.label.my : sc.label.en}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              {lang === "my" ? "ငွေပေးချေမှု အသေးစိတ်" : "Payment Details"}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပမာဏ" : "Amount"}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.currency === "MMK" ? `${selected.amount.toLocaleString()} ကျပ်` : `$${selected.amount}`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အခြေအနေ" : "Status"}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {lang === "my" ? statusConfig[selected.status]?.label.my : statusConfig[selected.status]?.label.en}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပေးချေနည်း" : "Method"}</p>
                  <p className="text-sm font-semibold text-foreground">{methodLabels[selected.payment_method]}</p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ရက်စွဲ" : "Submitted"}</p>
                  <p className="text-sm font-semibold text-foreground">{new Date(selected.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {selected.admin_note && (selected.status === "rejected" || selected.status === "revoked") && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold text-destructive">
                    {lang === "my" ? "Admin မှ မှတ်ချက်" : "Reason from admin"}
                  </p>
                  <p className="text-xs text-foreground">{selected.admin_note}</p>
                </div>
              )}

              {selected.proof_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-foreground">
                    {lang === "my" ? "ငွေလွှဲ အထောက်အထား" : "Payment Proof"}
                  </p>
                  {proofUrl ? (
                    <img src={proofUrl} alt="proof" className="max-h-64 w-full rounded-xl border border-border object-contain" />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-muted">
                      <p className="text-xs text-muted-foreground">{lang === "my" ? "ပုံ ဖွင့်နေသည်..." : "Loading..."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PaymentHistory;
