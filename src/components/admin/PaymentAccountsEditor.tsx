import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  useReceivingAccount,
  useUpdateAppConfig,
  type ReceivingAccountConfig,
} from "@/hooks/use-app-config";

const empty = (): ReceivingAccountConfig => ({
  method_label: "",
  account_name: "",
  account_number: "",
  account_email: "",
  qr_url: "",
});

const PaymentAccountsEditor = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data, isLoading } = useReceivingAccount();
  const update = useUpdateAppConfig<ReceivingAccountConfig>("receiving_account");

  const [draft, setDraft] = useState<ReceivingAccountConfig>(empty());

  useEffect(() => {
    if (data) setDraft({ ...empty(), ...data });
  }, [data]);

  const setField = (k: keyof ReceivingAccountConfig, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const onSave = async () => {
    try {
      await update.mutateAsync(draft);
      toast({
        title: lang === "my" ? "သိမ်းပြီးပါပြီ" : "Saved",
        description: lang === "my" ? "ငွေလက်ခံ အကောင့်ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ" : "Receiving account updated",
      });
    } catch (e: any) {
      toast({
        title: lang === "my" ? "အမှား" : "Error",
        description: e?.message || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const previewValue = draft.account_number?.trim() || "";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {lang === "my" ? "ငွေလက်ခံ အကောင့် (QR အတွက်)" : "Receiving Payment Account (QR)"}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? "ဤအကောင့်တစ်ခုတည်းကို သုံးစွဲသူအားလုံး၏ ငွေပေးချေမှု QR အတွက် အသုံးပြုပါမည်"
              : "This single account is used to generate the QR code shown to every payer"}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">
              {lang === "my" ? "ငွေပေးချေနည်း အညွှန်း" : "Payment method label"}
            </Label>
            <Input
              value={draft.method_label ?? ""}
              onChange={(e) => setField("method_label", e.target.value)}
              className="h-8 text-xs"
              placeholder="KBZPay / Wave Pay / CB Pay …"
              maxLength={40}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "အကောင့်အမည်" : "Account name"}</Label>
            <Input
              value={draft.account_name ?? ""}
              onChange={(e) => setField("account_name", e.target.value)}
              className="h-8 text-xs"
              placeholder="ThweSat"
              maxLength={120}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "ဖုန်းနံပါတ်" : "Phone number"}</Label>
            <Input
              value={draft.account_number ?? ""}
              onChange={(e) => setField("account_number", e.target.value)}
              className="h-8 text-xs"
              placeholder="09-000-000-000"
              maxLength={64}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">{lang === "my" ? "အီးမေးလ် (optional)" : "Email (optional)"}</Label>
            <Input
              value={draft.account_email ?? ""}
              onChange={(e) => setField("account_email", e.target.value)}
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
              value={draft.qr_url ?? ""}
              onChange={(e) => setField("qr_url", e.target.value)}
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

        <div className="flex flex-col items-center gap-2 self-start rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">{lang === "my" ? "QR ကြိုကြည့်ရှုခြင်း" : "QR preview"}</p>
          <div className="rounded-lg bg-white p-2">
            {draft.qr_url ? (
              <img src={draft.qr_url} alt="QR" width={140} height={140} className="object-contain" />
            ) : previewValue ? (
              <QRCodeSVG value={previewValue} size={140} level="M" includeMargin={false} />
            ) : (
              <div className="flex h-[140px] w-[140px] items-center justify-center text-[10px] text-muted-foreground">
                {lang === "my" ? "ဖုန်းနံပါတ် ထည့်ပါ" : "Add a phone number"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentAccountsEditor;
