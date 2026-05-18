import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useNavigate } from "react-router-dom";
import { useWallet, useActionPrice, useSpendCredits } from "@/hooks/use-wallet";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionKey: string;
  targetType?: string;
  targetId?: string;
  /** Optional metadata stored with the unlock */
  metadata?: Record<string, any>;
  /** Idempotency key — defaults to action+target. Pass a unique value for one-shot actions like CV rewrites. */
  idempotencyKey?: string;
  onSuccess?: (result: { tx?: string; unlock?: string; already_unlocked?: boolean }) => void;
}

const SpendConfirmSheet = ({ open, onOpenChange, actionKey, targetType, targetId, metadata, idempotencyKey, onSuccess }: Props) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const price = useActionPrice(actionKey);
  const { data: wallet } = useWallet();
  const spend = useSpendCredits();
  const [busy, setBusy] = useState(false);

  const balance = wallet?.balance_credits ?? 0;
  const cost = price?.price_credits ?? 0;
  const insufficient = balance < cost;

  const submit = async () => {
    if (!price) return;
    setBusy(true);
    try {
      const idem = idempotencyKey || (targetId ? `${actionKey}:${targetId}` : `${actionKey}:${Date.now()}`);
      const res = await spend.mutateAsync({
        action_key: actionKey,
        target_type: targetType,
        target_id: targetId,
        idempotency_key: idem,
        metadata,
      });
      onSuccess?.(res);
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("insufficient_balance")) {
        toast.error(lang === "my" ? "Credit မလုံလောက်ပါ" : "Not enough Ks");
      } else {
        toast.error(msg || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!price) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-16 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t p-0">
        <SheetHeader className="border-b px-5 py-3">
          <SheetTitle className="text-base">{lang === "my" ? price.label_my : price.label_en}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "my" ? "ရရှိမည့် အကျိုးကျေးဇူး" : "What you'll get"}
            </div>
            <p className="mt-1.5 text-sm">{lang === "my" ? price.description_my : price.description_en}</p>
            {price.duration_days && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "my" ? `သက်တမ်း: ${price.duration_days} ရက်` : `Active for ${price.duration_days} days`}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "ကုန်ကျမည်" : "Cost"}</div>
              <div className="text-xl font-bold text-foreground">{cost.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">credits</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "လက်ကျန်" : "Balance"}</div>
              <div className={`text-xl font-bold tabular-nums ${insufficient ? "text-destructive" : "text-foreground"}`}>{balance.toLocaleString()}</div>
            </div>
          </div>

          {insufficient ? (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{lang === "my" ? `Credit ${(cost - balance).toLocaleString()} လို အပ်သည်။ ငွေဖြည့်ပါ။` : `You need ${(cost - balance).toLocaleString()} more Ks.`}</span>
              </div>
              <Button onClick={() => { onOpenChange(false); navigate("/wallet"); }} className="w-full rounded-xl">
                {lang === "my" ? "ငွေဖြည့်မည်" : "Top up wallet"}
              </Button>
            </>
          ) : (
            <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary">
              {busy ? "..." : (lang === "my" ? `${cost.toLocaleString()} Ks ပေး၍ ဝယ်ယူမည်` : `Confirm — pay ${cost.toLocaleString()} Ks`)}
            </Button>
          )}
          <button onClick={() => onOpenChange(false)} className="w-full text-center text-xs text-muted-foreground">
            {lang === "my" ? "မလုပ်တော့ပါ" : "Cancel"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpendConfirmSheet;
