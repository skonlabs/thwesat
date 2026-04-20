import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCreatePaymentRequest, uploadPaymentProof } from "@/hooks/use-payment";
import { usePaymentAccounts } from "@/hooks/use-app-config";

export type PaymentMethod = "kbzpay" | "wave" | "wise" | "payoneer" | "venmo";

interface PaymentMethodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  paymentType: "subscription" | "mentor_session" | "employer_subscription";
  referenceId?: string;
  onSuccess?: () => void;
}

type MethodMeta = {
  name: string;
  logo: string;
  color: string;
  instructions: { en: string; my: string }[];
};

const methodMeta: Record<PaymentMethod, MethodMeta> = {
  kbzpay: {
    name: "KBZPay",
    logo: "💳",
    color: "bg-blue-500/10 text-blue-600",
    instructions: [
      { en: "Open KBZPay app", my: "KBZPay အက်ပ်ကို ဖွင့်ပါ" },
      { en: "Transfer to the account below", my: "အောက်ပါ အကောင့်သို့ လွှဲပါ" },
      { en: "Upload payment screenshot as proof", my: "ငွေလွှဲပြီးကြောင်း screenshot ကို တင်ပါ" },
    ],
  },
  wave: {
    name: "Wave Money",
    logo: "📱",
    color: "bg-yellow-500/10 text-yellow-600",
    instructions: [
      { en: "Open Wave Money app", my: "Wave Money အက်ပ်ကို ဖွင့်ပါ" },
      { en: "Transfer to the account below", my: "အောက်ပါ အကောင့်သို့ လွှဲပါ" },
      { en: "Upload payment screenshot as proof", my: "ငွေလွှဲပြီးကြောင်း screenshot ကို တင်ပါ" },
    ],
  },
  wise: {
    name: "Wise",
    logo: "🌍",
    color: "bg-green-500/10 text-green-600",
    instructions: [
      { en: "Log in to your Wise account", my: "Wise အကောင့်သို့ ဝင်ပါ" },
      { en: "Send money to the account below", my: "အောက်ပါ အကောင့်သို့ ငွေလွှဲပါ" },
      { en: "Upload transaction confirmation as proof", my: "ငွေလွှဲပြီးကြောင်း အထောက်အထားကို တင်ပါ" },
    ],
  },
  payoneer: {
    name: "Payoneer",
    logo: "💰",
    color: "bg-orange-500/10 text-orange-600",
    instructions: [
      { en: "Log in to your Payoneer account", my: "Payoneer အကောင့်သို့ ဝင်ပါ" },
      { en: "Make a payment to the email below", my: "အောက်ပါ အီးမေးလ်သို့ ငွေလွှဲပါ" },
      { en: "Upload transaction confirmation as proof", my: "ငွေလွှဲပြီးကြောင်း အထောက်အထားကို တင်ပါ" },
    ],
  },
};

const allMethods: PaymentMethod[] = ["kbzpay", "wave", "wise", "payoneer"];

const buildAccountInfo = (
  method: PaymentMethod,
  acc: { account_name?: string; account_number?: string; account_email?: string } | undefined,
): { label: { en: string; my: string }; value: string }[] => {
  if (!acc) return [];
  const info: { label: { en: string; my: string }; value: string }[] = [];
  if (acc.account_number) {
    info.push({ label: { en: "Phone", my: "ဖုန်းနံပါတ်" }, value: acc.account_number });
  }
  if (acc.account_email) {
    info.push({ label: { en: "Email", my: "အီးမေးလ်" }, value: acc.account_email });
  }
  if (acc.account_name) {
    info.push({ label: { en: "Name", my: "အမည်" }, value: acc.account_name });
  }
  return info;
};

const PaymentMethodSheet = ({
  open,
  onOpenChange,
  amount,
  currency,
  paymentType,
  referenceId,
  onSuccess,
}: PaymentMethodSheetProps) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const createPayment = useCreatePaymentRequest();
  const { data: accounts } = usePaymentAccounts();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"select" | "instructions" | "upload" | "done">("select");
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const reset = () => {
    setStep("select");
    setSelected(null);
    setProofFile(null);
    setProofPreview(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelectMethod = (m: PaymentMethod) => {
    setSelected(m);
    setStep("instructions");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !selected || !proofFile) return;
    setUploading(true);
    try {
      const proofUrl = await uploadPaymentProof(user.id, proofFile);
      await createPayment.mutateAsync({
        payment_method: selected,
        payment_type: paymentType,
        amount,
        currency,
        reference_id: referenceId,
        proof_url: proofUrl,
      });
      setStep("done");
    } catch {
      toast({
        title: lang === "my" ? "အမှား" : "Error",
        description: lang === "my" ? "တင်သွင်းမှု မအောင်မြင်ပါ" : "Failed to submit payment",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    onSuccess?.();
    handleClose(false);
  };

  const config = selected ? methodMeta[selected] : null;
  const accountInfo = selected ? buildAccountInfo(selected, accounts?.[selected]) : [];

  const displayAmount = currency === "MMK"
    ? `${amount.toLocaleString()} ကျပ်`
    : `$${amount}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: lang === "my" ? "ကူးယူပြီး" : "Copied!" });
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-8">
        <SheetHeader>
          <SheetTitle className="text-base font-bold">
            {step === "select" && (lang === "my" ? "ငွေပေးချေနည်း ရွေးချယ်ပါ" : "Choose Payment Method")}
            {step === "instructions" && (lang === "my" ? "ငွေလွှဲနည်းလမ်း" : "Payment Instructions")}
            {step === "upload" && (lang === "my" ? "အထောက်အထား တင်ပါ" : "Upload Proof")}
            {step === "done" && (lang === "my" ? "တင်သွင်းပြီးပါပြီ!" : "Submitted!")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {/* Amount display */}
          {step !== "done" && (
            <div className="mb-4 rounded-xl bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပေးချေရမည့်ပမာဏ" : "Amount to Pay"}</p>
              <p className="text-xl font-bold text-foreground">{displayAmount}</p>
            </div>
          )}

          {/* Step: Select */}
          {step === "select" && (
            <div className="space-y-2">
              {allMethods.map((m) => {
                const c = methodMeta[m];
                return (
                  <motion.button
                    key={m}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleSelectMethod(m)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:bg-muted"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${c.color}`}>
                      {c.logo}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {m === "kbzpay" && (lang === "my" ? "မြန်မာ မိုဘိုင်း ငွေပေးချေမှု" : "Myanmar mobile payment")}
                        {m === "wave" && (lang === "my" ? "မြန်မာ မိုဘိုင်း ငွေပေးချေမှု" : "Myanmar mobile money")}
                        {m === "wise" && (lang === "my" ? "နိုင်ငံတကာ ငွေလွှဲ" : "International transfer")}
                        {m === "payoneer" && (lang === "my" ? "နိုင်ငံတကာ ငွေလွှဲ" : "International transfer")}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Step: Instructions */}
          {step === "instructions" && config && (
            <div>
              <button onClick={() => setStep("select")} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="h-3 w-3" /> {lang === "my" ? "နောက်သို့" : "Back"}
              </button>

              <div className="mb-4 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${config.color}`}>
                  {config.logo}
                </div>
                <h3 className="text-sm font-bold text-foreground">{config.name}</h3>
              </div>

              {/* Instructions */}
              <div className="mb-4 space-y-2">
                {config.instructions.map((inst, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-xs text-foreground">{lang === "my" ? inst.my : inst.en}</p>
                  </div>
                ))}
              </div>

              {/* Account info */}
              <div className="mb-4 rounded-xl border border-border bg-card p-3 space-y-2">
                {accountInfo.map((info, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? info.label.my : info.label.en}</p>
                      <p className="text-sm font-semibold text-foreground">{info.value}</p>
                    </div>
                    <button onClick={() => copyToClipboard(info.value)} className="rounded-lg bg-muted p-2 active:bg-muted/70">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="default" className="w-full rounded-xl" onClick={() => setStep("upload")}>
                {lang === "my" ? "ငွေလွှဲပြီးပါပြီ — အထောက်အထား တင်ရန်" : "I've Paid — Upload Proof"}
              </Button>
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div>
              <button onClick={() => setStep("instructions")} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="h-3 w-3" /> {lang === "my" ? "နောက်သို့" : "Back"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {proofPreview ? (
                <div className="mb-4">
                  <img src={proofPreview} alt="proof" className="mx-auto max-h-48 rounded-xl border border-border object-contain" />
                  <button onClick={() => fileRef.current?.click()} className="mt-2 w-full text-center text-xs text-primary font-medium">
                    {lang === "my" ? "ပုံ ပြောင်းရန်" : "Change image"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mb-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center active:bg-muted/30"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-foreground">
                    {lang === "my" ? "ငွေလွှဲစာရင်း screenshot ကို တင်ပါ" : "Upload payment screenshot"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "my" ? "PNG, JPG — အများဆုံး 5MB" : "PNG, JPG — Max 5MB"}
                  </p>
                </button>
              )}

              <Button
                variant="default"
                className="w-full rounded-xl"
                disabled={!proofFile || uploading}
                onClick={handleSubmit}
              >
                {uploading ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {lang === "my" ? "တင်သွင်းနေသည်..." : "Submitting..."}</>
                ) : (
                  lang === "my" ? "အတည်ပြုရန်" : "Submit Payment"
                )}
              </Button>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                <CheckCircle className="h-8 w-8 text-emerald" strokeWidth={1.5} />
              </div>
              <h3 className="mb-1 text-base font-bold text-foreground">
                {lang === "my" ? "တင်သွင်းပြီးပါပြီ!" : "Payment Submitted!"}
              </h3>
              <p className="mb-1 text-xs text-muted-foreground">
                {lang === "my"
                  ? "သင့်ငွေပေးချေမှုကို စစ်ဆေးနေပါသည်။ ၂၄ နာရီ အတွင်း အတည်ပြုပါမည်။"
                  : "Your payment is being reviewed. We'll confirm within 24 hours."}
              </p>
              <p className="mb-4 text-[10px] text-muted-foreground">
                {lang === "my" ? "အတည်ပြုပြီးပါက အကြောင်းကြားပါမည်" : "You'll be notified once approved"}
              </p>
              <Button variant="default" className="w-full rounded-xl" onClick={handleDone}>
                {lang === "my" ? "မျက်နှာစာသို့ ပြန်သွားရန်" : "Done"}
              </Button>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentMethodSheet;
