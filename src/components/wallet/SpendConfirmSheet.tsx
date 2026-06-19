import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useNavigate } from "react-router-dom";
import { useWallet, useActionPrice, useSpendCredits, formatCredits } from "@/hooks/use-wallet";
import { useMyQuotas } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
  const { data: quotas } = useMyQuotas();
  const spend = useSpendCredits();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Subscription-quota-driven actions (new pricing model)
  const isQuotaUnlock = actionKey === "unlock_contact";
  const isQuotaFeatured = actionKey === "featured_job";
  const isQuotaAction = isQuotaUnlock || isQuotaFeatured;

  const unlocksLeft = Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));
  const featuredLeft = Math.max(0, (quotas?.featured_jobs_total ?? 0) - (quotas?.featured_jobs_used ?? 0));
  const remaining = isQuotaUnlock ? unlocksLeft : featuredLeft;
  const noSubscription = isQuotaAction && !quotas;
  const quotaExhausted = isQuotaAction && !!quotas && remaining <= 0;

  const balance = wallet?.balance_credits ?? 0;
  const cost = price?.price_credits ?? 0;
  const insufficient = !isQuotaAction && balance < cost;

  const submit = async () => {
    setBusy(true);
    try {
      if (isQuotaUnlock) {
        const { data, error } = await (supabase as any).rpc("unlock_contact_with_quota", {
          _target_type: targetType ?? "applicant",
          _target_id: targetId,
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["subscription-quotas"] });
        queryClient.invalidateQueries({ queryKey: ["feature-unlocks"] });
        onSuccess?.({ unlock: data?.unlock, already_unlocked: data?.already_unlocked });
        onOpenChange(false);
      } else if (isQuotaFeatured) {
        const { data, error } = await (supabase as any).rpc("feature_job_with_quota", {
          _job_id: targetId,
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["subscription-quotas"] });
        queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        onSuccess?.({ unlock: data?.job_id, already_unlocked: data?.already_featured });
        onOpenChange(false);
      } else {
        if (!price) return;
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
      }
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("no_unlocks_remaining") || msg.includes("quota_exhausted_featured")) {
        toast.error(lang === "my" ? "လက်ကျန် မရှိတော့ပါ" : "No quota remaining");
      } else if (msg.includes("no_active_subscription")) {
        toast.error(lang === "my" ? "Subscription တစ်ခု လိုအပ်သည်" : "An active subscription is required");
      } else if (msg.includes("insufficient_balance")) {
        toast.error(lang === "my" ? "Wallet လက်ကျန် မလုံလောက်ပါ" : "Not enough wallet balance");
      } else {
        toast.error(msg || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isQuotaAction && !price) return null;

  const title = isQuotaUnlock
    ? (lang === "my" ? "ဆက်သွယ်ရန် အချက်အလက် ဖွင့်ရန်" : "Unlock candidate contact")
    : isQuotaFeatured
    ? (lang === "my" ? "Job ကို Featured အဖြစ် တင်ရန်" : "Feature this job")
    : (lang === "my" ? price!.label_my : price!.label_en);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-16 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t p-0">
        <SheetHeader className="border-b px-5 py-3">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-5 py-4">
          {isQuotaUnlock ? (
            <>
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "my" ? "ရရှိမည့် အကျိုးကျေးဇူး" : "What you'll get"}
                </div>
                <p className="mt-1.5 text-sm">
                  {lang === "my"
                    ? "ကိုယ်စားလှယ်တစ်ဦး၏ email နှင့် ဖုန်းနံပါတ်ကို ကြည့်ရှုနိုင်ပါမည်။"
                    : "See this candidate's email and phone number."}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "ကုန်ကျမည်" : "Cost"}</div>
                  <div className="text-xl font-bold text-foreground">1 Unlock</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "လက်ကျန်" : "Remaining"}</div>
                  <div className={`text-xl font-bold tabular-nums ${quotaExhausted || noSubscription ? "text-destructive" : "text-foreground"}`}>
                    {quotas ? unlocksLeft.toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              {noSubscription ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lang === "my" ? "Subscription တစ်ခု လိုအပ်ပါသည်။" : "An active subscription is required to unlock contacts."}</span>
                  </div>
                  <Button onClick={() => { onOpenChange(false); navigate("/pricing"); }} className="w-full rounded-xl">
                    {lang === "my" ? "Plan ရွေးမည်" : "Choose a plan"}
                  </Button>
                </>
              ) : quotaExhausted ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lang === "my" ? "Unlock လက်ကျန် မရှိတော့ပါ။ Unlock pack ထပ်ဝယ်ပါ။" : "You're out of unlocks. Buy an unlock pack to continue."}</span>
                  </div>
                  <Button onClick={() => { onOpenChange(false); navigate("/pricing"); }} className="w-full rounded-xl">
                    {lang === "my" ? "Unlock Pack ဝယ်မည်" : "Buy unlock pack"}
                  </Button>
                </>
              ) : (
                <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary">
                  {busy ? "..." : (lang === "my" ? "1 Unlock သုံး၍ ဖွင့်မည်" : "Confirm — use 1 unlock")}
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "my" ? "ရရှိမည့် အကျိုးကျေးဇူး" : "What you'll get"}
                </div>
                <p className="mt-1.5 text-sm">{lang === "my" ? price!.description_my : price!.description_en}</p>
                {price!.duration_days && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {lang === "my" ? `သက်တမ်း: ${price!.duration_days} ရက်` : `Active for ${price!.duration_days} days`}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "ကုန်ကျမည်" : "Cost"}</div>
                  <div className="text-xl font-bold text-foreground">{formatCredits(cost, lang)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "လက်ကျန်" : "Balance"}</div>
                  <div className={`text-xl font-bold tabular-nums ${insufficient ? "text-destructive" : "text-foreground"}`}>{formatCredits(balance, lang)}</div>
                </div>
              </div>

              {insufficient ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lang === "my" ? `${formatCredits(cost - balance, lang)} လိုအပ်သည်။ ငွေဖြည့်ပါ။` : `You need ${formatCredits(cost - balance, lang)} more.`}</span>
                  </div>
                  <Button onClick={() => { onOpenChange(false); navigate("/wallet"); }} className="w-full rounded-xl">
                    {lang === "my" ? "ငွေဖြည့်မည်" : "Top up wallet"}
                  </Button>
                </>
              ) : (
                <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary">
                  {busy ? "..." : (lang === "my" ? `${formatCredits(cost, lang)} ပေး၍ ဝယ်ယူမည်` : `Confirm — pay ${formatCredits(cost, lang)}`)}
                </Button>
              )}
            </>
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
