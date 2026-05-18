import { useEffect, useRef, useState } from "react";
import { Loader2, Save, QrCode, Upload, Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
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
  const [payload, setPayload] = useState("");
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);

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

  const generateQr = () => {
    const value = payload.trim();
    if (!value) {
      toast({
        title: lang === "my" ? "Payload လိုအပ်သည်" : "Payload required",
        description:
          lang === "my"
            ? "Wallet provider မှ ပေးထားသော merchant payload (URL သို့မဟုတ် string) ကို ထည့်ပါ"
            : "Paste the merchant payload (URL or string) provided by your wallet provider",
        variant: "destructive",
      });
      return;
    }
    const canvas = hiddenCanvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      toast({ title: "Error", description: "QR canvas not ready", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      setField("qr_url", dataUrl);
      toast({
        title: lang === "my" ? "QR ပြုလုပ်ပြီး" : "QR generated",
        description:
          lang === "my"
            ? "မမှားယွင်းကြောင်း သေချာစေရန် 'သိမ်းမည်' ကိုနှိပ်ပါ"
            : "Click Save to persist this QR for payers",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to generate", variant: "destructive" });
    }
  };

  const clearQr = () => setField("qr_url", "");

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

          {/* QR source: upload image URL OR generate from secret payload */}
          <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] font-semibold text-foreground">
                {lang === "my" ? "QR ဖန်တီးခြင်း" : "QR generation"}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {lang === "my"
                ? "လုံခြုံမှုအတွက် QR ကို အများသူငှာ ဖုန်းနံပါတ်မှ အလိုအလျောက် မဖန်တီးတော့ပါ။ Wallet provider ၏ merchant payload (URL/string) ကို ထည့်၍ QR ပြုလုပ်ပါ၊ သို့မဟုတ် ပုံ URL တိုက်ရိုက် ထည့်ပါ။"
                : "For security, QR is no longer auto-derived from the public phone number. Paste the wallet provider's merchant payload (URL/string) to generate, or supply an image URL directly."}
            </p>

            <div>
              <Label className="text-[10px] text-muted-foreground">
                {lang === "my" ? "Merchant payload (admin only)" : "Merchant payload (admin only)"}
              </Label>
              <div className="flex gap-1.5">
                <Input
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="kbzpay://merchant/…  or  https://…"
                />
                <Button size="sm" type="button" onClick={generateQr} className="h-8 rounded-lg">
                  <QrCode className="mr-1 h-3.5 w-3.5" />
                  {lang === "my" ? "ဖန်တီးမည်" : "Generate"}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">
                {lang === "my" ? "သို့မဟုတ် QR ပုံ URL" : "Or QR image URL"}
              </Label>
              <div className="flex gap-1.5">
                <Input
                  value={draft.qr_url ?? ""}
                  onChange={(e) => setField("qr_url", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="https://…/qr.png  or  data:image/png;base64,…"
                />
                {draft.qr_url ? (
                  <Button size="sm" type="button" variant="outline" onClick={clearQr} className="h-8 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" type="button" variant="outline" disabled className="h-8 rounded-lg">
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 self-start rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">{lang === "my" ? "QR ကြိုကြည့်ရှုခြင်း" : "QR preview"}</p>
          <div className="rounded-lg bg-white p-2">
            {draft.qr_url ? (
              <img src={draft.qr_url} alt="QR" width={140} height={140} className="object-contain" />
            ) : (
              <div className="flex h-[140px] w-[140px] items-center justify-center text-center text-[10px] text-muted-foreground">
                {lang === "my" ? "QR မရှိသေးပါ" : "No QR yet"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas used to rasterize the generated QR to a PNG data URL. */}
      <div ref={hiddenCanvasRef} className="hidden">
        {payload.trim() && (
          <QRCodeCanvas value={payload.trim()} size={512} level="M" includeMargin={false} />
        )}
      </div>
    </div>
  );
};

export default PaymentAccountsEditor;
