import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  type SubscriptionPlan,
  type AddonProduct,
  type BillingCycle,
  computePrice,
  planLabel,
  formatMMK,
  uploadSubscriptionProof,
  useCreateSubscriptionPaymentRequest,
  useLaunchPromo,
  isLaunchActive,
} from "@/hooks/use-subscription";
import { useReceivingAccount } from "@/hooks/use-app-config";
import { PaymentMethodIcon } from "@/components/payment/PaymentMethodIcon";
import PaymentQR from "@/components/payment/PaymentQR";
import { SUPPORTED_PAYMENT_METHODS, getPlatformPaymentMethodLabel } from "@/lib/payment-methods";
import { toast } from "sonner";

type Selection =
  | { kind: "subscription"; plan: SubscriptionPlan; cycle: BillingCycle }
  | { kind: "addon"; addon: AddonProduct };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: Selection | null;
}

const METHODS = SUPPORTED_PAYMENT_METHODS.map((k) => ({ key: k, label: getPlatformPaymentMethodLabel(k) }));

const SubscribeSheet = ({ open, onOpenChange, selection }: Props) => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const { user } = useAuth();
  const { data: acc } = useReceivingAccount();
  const { data: promo } = useLaunchPromo();
  const launchActive = isLaunchActive(promo);
  const create = useCreateSubscriptionPaymentRequest();

  const [method, setMethod] = useState("kbzpay");
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [step, setStep] = useState<"pay" | "done">("pay");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("kbzpay");
      setReference("");
      setProofFile(null);
      setStep("pay");
    }
  }, [open, selection]);

  if (!selection) return null;

  const isSub = selection.kind === "subscription";
  const priceInfo = isSub ? computePrice(selection.plan, selection.cycle, launchActive) : null;
  const mmk = isSub ? priceInfo!.mmk : selection.addon.mmk;
  const title = isSub
    ? `${planLabel(selection.plan.tier)} · ${selection.cycle === "yearly" ? (my ? "နှစ်စဉ်" : "Yearly") : my ? "လစဉ်" : "Monthly"}`
    : (my && selection.addon.label_my) || selection.addon.label_en;

  const submit = async () => {
    if (!user) return;
    if (!proofFile) {
      toast.error(my ? "ငွေပေးသွင်းပြီး screenshot တင်ပေးပါ" : "Please upload your payment screenshot");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadSubscriptionProof(user.id, proofFile);
      if (isSub) {
        await create.mutateAsync({
          request_type: "subscription",
          plan_id: selection.plan.id,
          cycle: selection.cycle,
          addon_id: null,
          mmk_amount: mmk,
          launch_price_applied: priceInfo!.launchApplied,
          payment_method: method,
          proof_url: path,
          sender_reference: reference || null,
        });
      } else {
        await create.mutateAsync({
          request_type: "addon",
          plan_id: null,
          cycle: null,
          addon_id: selection.addon.id,
          mmk_amount: mmk,
          launch_price_applied: false,
          payment_method: method,
          proof_url: path,
          sender_reference: reference || null,
        });
      }
      setStep("done");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-16 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t p-0">
        <SheetHeader className="border-b px-5 py-3">
          <SheetTitle className="text-base">
            {step === "done" ? (my ? "ပေးပို့ပြီး" : "Payment submitted") : title}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4">
          {step === "pay" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-3">
                <div className="text-[11px] text-muted-foreground">{my ? "ပေးချေရမည့် ပမာဏ" : "Amount to pay"}</div>
                <div className="text-2xl font-bold text-primary">{formatMMK(mmk)}</div>
                {isSub && priceInfo!.launchApplied && (
                  <div className="mt-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {my ? "ဖွင့်ပွဲ စျေးနှုန်း · ပထမ ၃ လ" : "Launch price · first 3 months"}
                  </div>
                )}
                {isSub && selection.cycle === "yearly" && (
                  <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    {my ? "နှစ်စဉ် — တစ်လ အခမဲ့" : "Yearly — one month free"}
                  </div>
                )}
                {!isSub && selection.addon.duration_days && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {my ? `သက်တမ်း ${selection.addon.duration_days} ရက်` : `Active for ${selection.addon.duration_days} days`}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">{my ? "ပေးချေနည်း" : "Payment method"}</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
                        method === m.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <PaymentMethodIcon method={m.key} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {acc && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{my ? "လွှဲရန် အကောင့်" : "Send to"}</div>
                  <div className="mt-0.5 text-sm font-bold">{acc.account_name}</div>
                  <div className="font-mono text-sm">{acc.account_number || acc.account_email}</div>
                  {acc.qr_by_method?.[method] && (
                    <div className="mt-3"><PaymentQR qrUrl={acc.qr_by_method[method]} size={140} /></div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-xs">{my ? "လွှဲပြီးသား Reference (optional)" : "Transfer reference (optional)"}</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 h-9 text-xs" placeholder="e.g. TX-12345" maxLength={64} />
              </div>

              <div>
                <Label className="text-xs">{my ? "Payment Screenshot *" : "Payment screenshot *"}</Label>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-4 text-xs text-muted-foreground hover:border-primary">
                  <Upload className="h-4 w-4" />
                  {proofFile ? proofFile.name : my ? "ပုံ ရွေးပါ" : "Choose image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <Button onClick={submit} disabled={uploading || !proofFile} className="w-full rounded-xl">
                {uploading ? (my ? "တင်နေသည်..." : "Submitting...") : my ? "တင်သွင်းမည်" : "Submit for review"}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold">
                {my ? "Admin အတည်ပြုပြီးမှ သင်၏ Package သက်ဝင်ပါမည်" : "Your plan activates after admin approval"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {my ? "ပုံမှန်အားဖြင့် နာရီအနည်းငယ်အတွင်း" : "Usually within a few hours"}
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-4 w-full rounded-xl">
                {my ? "ပိတ်" : "Close"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SubscribeSheet;
