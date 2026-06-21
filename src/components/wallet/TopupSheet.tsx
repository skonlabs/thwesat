import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useCreateTopupRequest, uploadTopupProof, formatCredits, formatMMK, type CreditPackage } from "@/hooks/use-wallet";
import { useReceivingAccount } from "@/hooks/use-app-config";
import { PaymentMethodIcon } from "@/components/payment/PaymentMethodIcon";
import PaymentQR from "@/components/payment/PaymentQR";
import { SUPPORTED_PAYMENT_METHODS, getPlatformPaymentMethodLabel } from "@/lib/payment-methods";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPackage?: CreditPackage;
  packages: CreditPackage[];
}

const METHODS: Array<{ key: string; label: string }> = SUPPORTED_PAYMENT_METHODS.map((k) => ({
  key: k,
  label: getPlatformPaymentMethodLabel(k),
}));

const MIN_CUSTOM = 5000;

const TopupSheet = ({ open, onOpenChange, initialPackage, packages }: Props) => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const { user } = useAuth();
  const { data: acc } = useReceivingAccount();
  const [pkg, setPkg] = useState<CreditPackage | undefined>(initialPackage);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [method, setMethod] = useState("kbzpay");
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const create = useCreateTopupRequest();

  useEffect(() => {
    if (open) {
      setPkg(initialPackage);
      setIsCustom(false);
      setCustomAmount("");
      setMethod("kbzpay");
      setReference("");
      setProofFile(null);
      setCopied(false);
      setStep(initialPackage ? "pay" : "select");
    }
  }, [open, initialPackage]);

  // Resolve effective top-up amount/credits depending on package vs custom
  const customMmk = Math.max(0, Math.round((Number(customAmount) || 0) / 1000) * 1000);
  const effective = isCustom
    ? { mmk: customMmk, credits: customMmk, label: my ? "စိတ်ကြိုက်ပမာဏ" : "Custom amount", saved: 0 }
    : pkg
      ? {
          mmk: pkg.price_mmk,
          credits: pkg.credits + pkg.bonus_credits,
          label: my ? pkg.name_my : pkg.name_en,
          saved: Math.max(0, (pkg.credits + pkg.bonus_credits) - pkg.price_mmk),
        }
      : null;

  const customValid = isCustom ? customMmk >= MIN_CUSTOM : true;

  // sort packages by price for a clean ladder
  const sortedPackages = useMemo(
    () => [...packages].sort((a, b) => a.price_mmk - b.price_mmk),
    [packages],
  );

  const copyAccount = async () => {
    const text = acc?.account_number || acc?.account_email || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const submit = async () => {
    if (!user || !effective) return;
    if (isCustom && !customValid) {
      toast.error(my ? `အနည်းဆုံး ${formatMMK(MIN_CUSTOM, lang)}` : `Minimum ${formatMMK(MIN_CUSTOM, lang)}`);
      return;
    }
    if (!proofFile) {
      toast.error(my ? "ငွေပေးသွင်းပြီး screenshot တင်ပေးပါ" : "Please upload your payment screenshot");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadTopupProof(user.id, proofFile);
      await create.mutateAsync({
        package_id: isCustom ? null : pkg!.id,
        mmk_amount: effective.mmk,
        credits_to_grant: effective.credits,
        payment_method: method,
        proof_url: path,
        sender_reference: reference || null,
      });
      setStep("done");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  const stepNumber = step === "select" ? 1 : step === "pay" ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2">
            {step === "pay" && (
              <button
                onClick={() => setStep("select")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={my ? "နောက်သို့" : "Back"}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="text-base font-bold">
              {step === "done"
                ? my ? "ငွေဖြည့်မှု တင်သွင်းပြီးပါပြီ" : "Top-up submitted"
                : my ? "ငွေဖြည့်ရန်" : "Top up wallet"}
            </DialogTitle>
          </div>
          {step !== "done" && (
            <DialogDescription className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", stepNumber >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</span>
              <span className={stepNumber === 1 ? "text-foreground" : ""}>{my ? "ပက်ကေ့ချ်" : "Package"}</span>
              <span className="mx-1 h-px w-4 bg-border" />
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", stepNumber >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</span>
              <span className={stepNumber === 2 ? "text-foreground" : ""}>{my ? "ပေးချေပြီး အထောက်အထား" : "Pay & upload proof"}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-5 py-5">
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">{my ? "ပက်ကေ့ချ်တစ်ခု ရွေးချယ်ပါ" : "Choose a package"}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {my
                    ? "ပက်ကေ့ချ်ကြီးလေ၊ သက်သာလေ ဖြစ်ပါသည်။"
                    : "Bigger packages give you a better discount."}
                </p>
              </div>

              <div className="grid gap-2">
                {sortedPackages.map((p) => {
                  const totalCredits = p.credits + p.bonus_credits;
                  const saved = Math.max(0, totalCredits - p.price_mmk);
                  const discountPct = totalCredits > 0 ? Math.round((saved / totalCredits) * 100) : 0;
                  const isSelected = !isCustom && pkg?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setPkg(p); setIsCustom(false); setStep("pay"); }}
                      className={cn(
                        "group relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold tabular-nums">{formatCredits(totalCredits, lang)}</span>
                          {discountPct > 0 && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              −{discountPct}%
                            </span>
                          )}
                        </div>
                        {saved > 0 ? (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {my ? `သက်သာငွေ ${formatMMK(saved, lang)}` : `Save ${formatMMK(saved, lang)}`}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {my ? "ပုံမှန် နှုန်း" : "Standard rate"}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {my ? "သင် ပေးချေရမည်" : "You pay"}
                        </div>
                        <div className="text-base font-bold text-primary tabular-nums">{formatMMK(p.price_mmk, lang)}</div>
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={() => { setIsCustom(true); setPkg(undefined); setStep("pay"); }}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {my ? "စိတ်ကြိုက် ပမာဏ" : "Custom amount"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {my ? `1 ကျပ် = 1 credit · အနည်းဆုံး ${formatMMK(MIN_CUSTOM, lang)}` : `1 MMK = 1 credit · min ${formatMMK(MIN_CUSTOM, lang)}`}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-primary">{my ? "ရွေးရန်" : "Choose"}</div>
                </button>
              </div>
            </div>
          )}

          {step === "pay" && effective && (
            <div className="space-y-5">
              {/* Order summary */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {my ? "သင်၏ အော်ဒါ" : "Your order"}
                </div>
                {isCustom ? (
                  <div className="mt-2">
                    <Label className="text-xs">{my ? "ပမာဏ (ကျပ်)" : "Amount (MMK)"}</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={MIN_CUSTOM}
                      step={1000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      className="mt-1 h-11 text-base font-bold tabular-nums"
                      placeholder="50000"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {my ? "1,000 ၏ ဆ ဖြစ်ရမည် · အနည်းဆုံး 5,000 ကျပ်" : "Rounds to nearest 1,000 · min 5,000 MMK"}
                    </p>
                    {customMmk > 0 && (
                      <div className="mt-3 flex items-baseline justify-between border-t pt-3">
                        <span className="text-xs text-muted-foreground">{my ? "ရရှိမည့် Credit" : "You'll get"}</span>
                        <span className="text-base font-bold">{formatCredits(customMmk, lang)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">{my ? "သင် ပေးချေရမည်" : "You pay"}</span>
                      <span className="text-xl font-bold text-primary tabular-nums">{formatMMK(customMmk, lang)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">{my ? "ပက်ကေ့ချ်" : "Package"}</span>
                      <span className="text-sm font-semibold">{effective.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">{my ? "ရရှိမည့် Credit" : "You'll get"}</span>
                      <span className="text-base font-bold">{formatCredits(effective.credits, lang)}</span>
                    </div>
                    {effective.saved > 0 && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">{my ? "သက်သာငွေ" : "You save"}</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMMK(effective.saved, lang)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between border-t pt-2 mt-2">
                      <span className="text-xs font-semibold">{my ? "သင် ပေးချေရမည်" : "You pay"}</span>
                      <span className="text-xl font-bold text-primary tabular-nums">{formatMMK(effective.mmk, lang)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">
                  1. {my ? "ပေးချေနည်း ရွေးပါ" : "Choose payment method"}
                </Label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold transition-colors",
                        method === m.key
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      <PaymentMethodIcon method={m.key} />
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Send to */}
              {acc && (
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    2. {my ? "အောက်ပါ အကောင့်သို့ လွှဲပါ" : "Send the exact amount to this account"}
                  </Label>
                  <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {my ? "အကောင့်အမည်" : "Account name"}
                        </div>
                        <div className="text-sm font-bold">{acc.account_name}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {my ? "အကောင့်နံပါတ်" : "Account number"}
                        </div>
                        <div className="font-mono text-sm">{acc.account_number || acc.account_email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={copyAccount}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? (my ? "ကူးပြီး" : "Copied") : (my ? "ကူးယူ" : "Copy")}
                      </button>
                    </div>
                    {acc.qr_by_method?.[method] ? (
                      <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-primary/20 pt-4">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {my ? "QR ဖြင့် scan ဖတ်ပါ" : "Or scan this QR code"}
                        </div>
                        <PaymentQR qrUrl={acc.qr_by_method[method]} size={140} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Upload proof */}
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">
                  3. {my ? "ပြေစာ ပုံကို တင်ပါ" : "Upload your payment screenshot"}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 text-xs transition-colors",
                    proofFile
                      ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-card text-muted-foreground hover:border-primary",
                  )}
                >
                  {proofFile ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  <span className="truncate font-semibold">
                    {proofFile ? proofFile.name : (my ? "ပုံ ရွေးပါ" : "Choose image")}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              {/* Optional reference */}
              <div>
                <Label className="text-xs font-semibold">
                  {my ? "Reference နံပါတ်" : "Transfer reference"}
                  <span className="ml-1 font-normal text-muted-foreground">({my ? "မလိုအပ်ပါ" : "optional"})</span>
                </Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder={my ? "ဥပမာ: TX-12345" : "e.g. TX-12345"}
                  maxLength={64}
                />
              </div>

              <Button
                onClick={submit}
                disabled={uploading || !proofFile || !customValid || (isCustom && customMmk < MIN_CUSTOM)}
                className="h-11 w-full rounded-xl text-sm font-bold"
              >
                {uploading
                  ? (my ? "တင်နေသည်..." : "Submitting...")
                  : (my ? "စစ်ဆေးရန် တင်သွင်းမည်" : "Submit for review")}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                {my ? "Admin အတည်ပြုပြီးမှ Wallet ထဲသို့ ထည့်ပေးပါမည်။" : "Funds appear in your wallet after admin approval."}
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="mt-4 text-sm font-bold">
                {my ? "Admin အတည်ပြုပြီးမှ Wallet ထဲသို့ ထည့်ပေးမည်" : "Funds will appear after admin approval"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {my ? "ပုံမှန်အားဖြင့် နာရီအနည်းငယ်အတွင်း ပြီးစီးပါမည်" : "Usually within a few hours"}
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-5 w-full rounded-xl">
                {my ? "ပိတ်" : "Close"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopupSheet;
