import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useCreateTopupRequest, uploadTopupProof, formatMMK, type CreditPackage } from "@/hooks/use-wallet";
import { usePaymentAccounts } from "@/hooks/use-app-config";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPackage?: CreditPackage;
  packages: CreditPackage[];
}

const METHODS: Array<{ key: string; label: string }> = [
  { key: "kbzpay", label: "KBZPay" },
  { key: "wavepay", label: "WavePay" },
  { key: "cbpay", label: "CB Pay" },
  { key: "ayapay", label: "AYA Pay" },
  
];

const TopupSheet = ({ open, onOpenChange, initialPackage, packages }: Props) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: accounts } = usePaymentAccounts();
  const [pkg, setPkg] = useState<CreditPackage | undefined>(initialPackage);
  const [method, setMethod] = useState("kbzpay");
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [uploading, setUploading] = useState(false);
  const create = useCreateTopupRequest();

  useEffect(() => {
    if (open) {
      setPkg(initialPackage);
      setMethod("kbzpay");
      setReference("");
      setProofFile(null);
      setStep(initialPackage ? "pay" : "select");
    }
  }, [open, initialPackage]);

  const acc = accounts?.[method as keyof typeof accounts];

  const submit = async () => {
    if (!user || !pkg) return;
    if (!proofFile) {
      toast.error(lang === "my" ? "ငွေပေးသွင်းပြီး screenshot တင်ပေးပါ" : "Please upload your payment screenshot");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadTopupProof(user.id, proofFile);
      await create.mutateAsync({
        package_id: pkg.id,
        mmk_amount: pkg.price_mmk,
        credits_to_grant: pkg.credits + pkg.bonus_credits,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-16 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t p-0">
        <SheetHeader className="border-b px-5 py-3">
          <SheetTitle className="text-base">
            {step === "done"
              ? lang === "my" ? "ငွေဖြည့်မှု တင်သွင်းပြီးပါပြီ" : "Top-up submitted"
              : lang === "my" ? "ငွေဖြည့်ရန်" : "Top up wallet"}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4">
          {step === "select" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "Package တစ်ခု ရွေးချယ်ပါ" : "Choose a package"}</p>
              {packages.map((p) => (
                <button key={p.id} onClick={() => { setPkg(p); setStep("pay"); }}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left active:scale-[0.99]">
                  <div>
                    <div className="text-sm font-bold">{(p.credits + p.bonus_credits).toLocaleString()} credits</div>
                    {p.bonus_credits > 0 && <div className="text-[10px] text-emerald-600">+{p.bonus_credits.toLocaleString()} bonus</div>}
                  </div>
                  <div className="text-sm font-bold text-primary">{formatMMK(p.price_mmk, lang)}</div>
                </button>
              ))}
            </div>
          )}

          {step === "pay" && pkg && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-3">
                <div className="text-[11px] text-muted-foreground">{lang === "my" ? "ပေးချေရမည့် ပမာဏ" : "Amount to pay"}</div>
                <div className="text-2xl font-bold text-primary">{formatMMK(pkg.price_mmk, lang)}</div>
                <div className="mt-0.5 text-xs">→ {(pkg.credits + pkg.bonus_credits).toLocaleString()} credits</div>
              </div>

              <div>
                <Label className="text-xs">{lang === "my" ? "ပေးချေနည်း" : "Payment method"}</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {METHODS.map((m) => (
                    <button key={m.key} onClick={() => setMethod(m.key)}
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${method === m.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {acc && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "လွှဲရန် အကောင့်" : "Send to"}</div>
                  <div className="mt-0.5 text-sm font-bold">{acc.account_name}</div>
                  <div className="font-mono text-sm">{acc.account_number || acc.account_email}</div>
                </div>
              )}

              <div>
                <Label className="text-xs">{lang === "my" ? "လွှဲပြီးသား Reference (optional)" : "Transfer reference (optional)"}</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 h-9 text-xs" placeholder={lang === "my" ? "ဥပမာ: TX-12345" : "e.g. TX-12345"} maxLength={64} />
              </div>

              <div>
                <Label className="text-xs">{lang === "my" ? "Payment Screenshot *" : "Payment screenshot *"}</Label>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-4 text-xs text-muted-foreground hover:border-primary">
                  <Upload className="h-4 w-4" />
                  {proofFile ? proofFile.name : (lang === "my" ? "ပုံ ရွေးပါ" : "Choose image")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <Button onClick={submit} disabled={uploading || !proofFile} className="w-full rounded-xl">
                {uploading ? (lang === "my" ? "တင်နေသည်..." : "Submitting...") : (lang === "my" ? "တင်သွင်းမည်" : "Submit for review")}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold">
                {lang === "my" ? "Admin အတည်ပြုပြီးမှ Credit ထည့်ပေးမည်" : "Credits will appear after admin approval"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === "my" ? "ပုံမှန်အားဖြင့် နာရီအနည်းငယ်အတွင်း ပြီးစီးပါမည်" : "Usually within a few hours"}
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-4 w-full rounded-xl">{lang === "my" ? "ပိတ်" : "Close"}</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TopupSheet;
