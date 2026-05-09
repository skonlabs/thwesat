import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  usePaymentAccounts,
  useUpdateAppConfig,
  type PaymentAccountInfo,
  type PaymentAccountsConfig,
} from "@/hooks/use-app-config";
import { PaymentMethodIcon } from "@/components/payment/PaymentMethodIcon";

type MethodKey = keyof PaymentAccountsConfig;

const METHODS: { key: MethodKey; label: string }[] = [
  { key: "kbzpay", label: "KBZPay" },
  { key: "cbpay", label: "CB Pay" },
  { key: "wavepay", label: "Wave Pay" },
  { key: "ayapay", label: "AYA Pay" },
];

const empty = (): PaymentAccountInfo => ({
  account_name: "",
  account_number: "",
  account_email: "",
  qr_url: "",
});

const PaymentAccountsEditor = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data, isLoading } = usePaymentAccounts();
  const update = useUpdateAppConfig<PaymentAccountsConfig>("payment_accounts");

  const [draft, setDraft] = useState<PaymentAccountsConfig>({
    kbzpay: empty(),
    cbpay: empty(),
    wavepay: empty(),
    ayapay: empty(),
  });

  useEffect(() => {
    if (data) {
      setDraft({
        kbzpay: { ...empty(), ...data.kbzpay },
        cbpay: { ...empty(), ...data.cbpay },
        wavepay: { ...empty(), ...data.wavepay },
        ayapay: { ...empty(), ...data.ayapay },
      });
    }
  }, [data]);

  const setField = (m: MethodKey, k: keyof PaymentAccountInfo, v: string) =>
    setDraft((d) => ({ ...d, [m]: { ...d[m], [k]: v } }));

  const onSave = async () => {
    try {
      await update.mutateAsync(draft);
      toast({
        title: lang === "my" ? "သိမ်းပြီးပါပြီ" : "Saved",
        description: lang === "my" ? "အကောင့်အချက်အလက်များကို အပ်ဒိတ်လုပ်ပြီးပါပြီ" : "Payment accounts updated",
      });
    } catch (e: any) {
      toast({
        title: lang === "my" ? "အမှား" : "Error",
        description: e?.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {lang === "my" ? "ငွေလက်ခံ အကောင့်များ" : "Receiving Payment Accounts"}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? "Job seeker, employer, mentor အားလုံး၏ ငွေပေးချေမှုများကို ဤအကောင့်များသို့ လွှဲမည်"
              : "All roles will be instructed to send payments to these accounts"}
          </p>
        </div>
        <Button size="sm" onClick={onSave} disabled={update.isPending || isLoading} className="rounded-lg">
          {update.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Save className="mr-1 h-3.5 w-3.5" />
              {lang === "my" ? "သိမ်းမည်" : "Save"}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {METHODS.map(({ key, label }) => {
          const acc = draft[key];
          return (
            <div key={key} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-2">
                <PaymentMethodIcon method={key} />
                <h3 className="text-xs font-bold text-foreground">{label}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "အကောင့်အမည်" : "Account name"}</Label>
                  <Input
                    value={acc.account_name ?? ""}
                    onChange={(e) => setField(key, "account_name", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="ThweSat"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "ဖုန်းနံပါတ်" : "Phone number"}</Label>
                  <Input
                    value={acc.account_number ?? ""}
                    onChange={(e) => setField(key, "account_number", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="09-000-000-000"
                    maxLength={64}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "အီးမေးလ် (optional)" : "Email (optional)"}</Label>
                  <Input
                    value={acc.account_email ?? ""}
                    onChange={(e) => setField(key, "account_email", e.target.value)}
                    className="h-8 text-xs"
                    type="email"
                    placeholder="payments@thwesat.com"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    {lang === "my" ? "QR ပုံ URL (optional)" : "QR image URL (optional)"}
                  </Label>
                  <Input
                    value={acc.qr_url ?? ""}
                    onChange={(e) => setField(key, "qr_url", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="https://…/qr.png"
                    maxLength={500}
                  />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {lang === "my"
                      ? "ဗလာဆိုလျှင် ဖုန်းနံပါတ်မှ QR ကို အလိုအလျောက် ဖန်တီးပါမည်"
                      : "If empty, a QR is auto-generated from the phone number"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentAccountsEditor;
