import { useEffect, useRef, useState } from "react";
import { Loader2, Save, QrCode, Trash2, Check } from "lucide-react";
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
import {
  SUPPORTED_PAYMENT_METHODS,
  getPlatformPaymentMethodLabel,
  type SupportedPaymentMethod,
} from "@/lib/payment-methods";

const empty = (): ReceivingAccountConfig => ({
  method_label: "",
  account_name: "",
  account_number: "",
  account_email: "",
  qr_url: "",
  qr_by_method: {},
});

const PaymentAccountsEditor = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data, isLoading } = useReceivingAccount();
  const update = useUpdateAppConfig<ReceivingAccountConfig>("receiving_account");

  const [draft, setDraft] = useState<ReceivingAccountConfig>(empty());
  const [activeMethod, setActiveMethod] = useState<SupportedPaymentMethod>(SUPPORTED_PAYMENT_METHODS[0]);
  const [payload, setPayload] = useState("");
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) setDraft({ ...empty(), ...data, qr_by_method: { ...(data.qr_by_method || {}) } });
  }, [data]);

  // Reset payload input when switching method
  useEffect(() => {
    setPayload("");
  }, [activeMethod]);

  const setField = <K extends keyof ReceivingAccountConfig>(k: K, v: ReceivingAccountConfig[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setMethodQr = (method: SupportedPaymentMethod, url: string) =>
    setDraft((d) => {
      const map = { ...(d.qr_by_method || {}) };
      if (url) map[method] = url;
      else delete map[method];
      return { ...d, qr_by_method: map };
    });

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
      setMethodQr(activeMethod, dataUrl);
      setPayload("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to generate", variant: "destructive" });
    }
  };

  const activeQr = draft.qr_by_method?.[activeMethod] || "";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {lang === "my" ? "ငွေလက်ခံ အကောင့် (QR အတွက်)" : "Receiving Payment Account (QR)"}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? "ဤအကောင့်တစ်ခုတည်းကို သုံးစွဲသူအားလုံး၏ ငွေပေးချေမှု အတွက် အသုံးပြုပါမည်။ ပေးချေနည်းတစ်ခုစီအတွက် သီးခြား QR ထားနိုင်ပါသည်။"
              : "This single account receives all payments. Each payment method can have its own QR code."}
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

      {/* Account fields */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
            {lang === "my" ? "Default အညွှန်း" : "Default method label"}
          </Label>
          <Input
            value={draft.method_label ?? ""}
            onChange={(e) => setField("method_label", e.target.value)}
            className="h-8 text-xs"
            placeholder="KBZPay"
            maxLength={40}
          />
        </div>
      </div>

      {/* Per-method QR */}
      <div className="mt-4 rounded-xl border border-dashed border-border p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold text-foreground">
            {lang === "my" ? "ပေးချေနည်းအလိုက် QR" : "QR per payment method"}
          </p>
        </div>

        {/* Method tabs */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SUPPORTED_PAYMENT_METHODS.map((m) => {
            const hasQr = !!draft.qr_by_method?.[m];
            const active = m === activeMethod;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMethod(m)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {getPlatformPaymentMethodLabel(m)}
                {hasQr && (
                  <Check className={`h-3 w-3 ${active ? "text-primary-foreground" : "text-emerald"}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">
              {lang === "my"
                ? "လုံခြုံမှုအတွက် QR ကို အများသူငှာ ဖုန်းနံပါတ်မှ အလိုအလျောက် မဖန်တီးတော့ပါ။ Wallet provider ၏ merchant payload ကို ထည့်၍ QR ပြုလုပ်ပါ၊ သို့မဟုတ် ပုံ URL တိုက်ရိုက် ထည့်ပါ။"
                : "For security, QR is no longer auto-derived from the public phone number. Paste the wallet provider's merchant payload to generate, or supply an image URL directly."}
            </p>

            <div>
              <Label className="text-[10px] text-muted-foreground">
                {lang === "my"
                  ? `${getPlatformPaymentMethodLabel(activeMethod)} merchant payload (admin only)`
                  : `${getPlatformPaymentMethodLabel(activeMethod)} merchant payload (admin only)`}
              </Label>
              <div className="flex gap-1.5">
                <Input
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder={`${activeMethod}://merchant/…  or  https://…`}
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
                  value={activeQr}
                  onChange={(e) => setMethodQr(activeMethod, e.target.value)}
                  className="h-8 text-xs"
                  placeholder="https://…/qr.png  or  data:image/png;base64,…"
                />
                {activeQr && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => setMethodQr(activeMethod, "")}
                    className="h-8 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 self-start rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] text-muted-foreground">
              {getPlatformPaymentMethodLabel(activeMethod)} {lang === "my" ? "QR" : "QR"}
            </p>
            <div className="rounded-lg bg-white p-2">
              {activeQr ? (
                <img src={activeQr} alt={`${activeMethod} QR`} width={140} height={140} className="object-contain" />
              ) : (
                <div className="flex h-[140px] w-[140px] items-center justify-center text-center text-[10px] text-muted-foreground">
                  {lang === "my" ? "QR မရှိသေးပါ" : "No QR yet"}
                </div>
              )}
            </div>
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
