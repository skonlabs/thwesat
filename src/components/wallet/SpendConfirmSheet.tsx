import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useNavigate } from "react-router-dom";
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
  /** Optional metadata stored with the unlock — currently unused; kept for backward compatibility. */
  metadata?: Record<string, any>;
  /** Idempotency key — kept for backward compatibility. */
  idempotencyKey?: string;
  onSuccess?: (result: { tx?: string; unlock?: string; already_unlocked?: boolean }) => void;
}

/**
 * Post-wallet refactor: this sheet only handles subscription-quota-driven actions
 * (unlock_contact, featured_job). Any other actionKey is treated as a
 * subscription-gated feature and redirects the user to /pricing.
 */
const SpendConfirmSheet = ({ open, onOpenChange, actionKey, targetType, targetId, onSuccess }: Props) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: quotas } = useMyQuotas();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const isQuotaUnlock = actionKey === "unlock_contact";
  const isQuotaFeatured = actionKey === "featured_job";
  const isQuotaAction = isQuotaUnlock || isQuotaFeatured;

  const unlocksLeft = Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));
  const featuredLeft = Math.max(0, (quotas?.featured_jobs_total ?? 0) - (quotas?.featured_jobs_used ?? 0));
  const remaining = isQuotaUnlock ? unlocksLeft : featuredLeft;
  const noSubscription = !quotas;
  const quotaExhausted = isQuotaAction && !!quotas && remaining <= 0;

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
      }
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("no_unlocks_remaining") || msg.includes("quota_exhausted_featured")) {
        toast.error(lang === "my" ? "လက်ကျန် မရှိတော့ပါ" : "No quota remaining");
      } else if (msg.includes("no_active_subscription")) {
        toast.error(lang === "my" ? "Subscription တစ်ခု လိုအပ်သည်" : "An active subscription is required");
      } else {
        toast.error(msg || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const title = isQuotaUnlock
    ? (lang === "my" ? "ဆက်သွယ်ရန် အချက်အလက် ဖွင့်ရန်" : "Unlock candidate contact")
    : isQuotaFeatured
    ? (lang === "my" ? "Job ကို Featured အဖြစ် တင်ရန်" : "Feature this job")
    : (lang === "my" ? "Subscription လိုအပ်သည်" : "Subscription required");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bottom-16 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t p-0">
        <SheetHeader className="border-b px-5 py-3">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-5 py-4">
          {!isQuotaAction ? (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {lang === "my"
                    ? "ဤလုပ်ဆောင်ချက် အသုံးပြုရန် Package တစ်ခု လိုအပ်ပါသည်။"
                    : "An active subscription package is required to use this feature."}
                </span>
              </div>
              <Button onClick={() => { onOpenChange(false); navigate("/pricing"); }} className="w-full rounded-xl">
                {lang === "my" ? "Plan ရွေးမည်" : "Choose a plan"}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "my" ? "ရရှိမည့် အကျိုးကျေးဇူး" : "What you'll get"}
                </div>
                <p className="mt-1.5 text-sm">
                  {isQuotaUnlock
                    ? (lang === "my"
                      ? "ကိုယ်စားလှယ်တစ်ဦး၏ email နှင့် ဖုန်းနံပါတ်ကို ကြည့်ရှုနိုင်ပါမည်။"
                      : "See this candidate's email and phone number.")
                    : (lang === "my"
                      ? "Job ကို Featured အဖြစ် ထိပ်ဆုံးတွင် ပြသပါမည်။"
                      : "Promote this job to the top of search results.")}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "ကုန်ကျမည်" : "Cost"}</div>
                  <div className="text-xl font-bold text-foreground">{isQuotaUnlock ? "1 Unlock" : "1 Slot"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">{lang === "my" ? "လက်ကျန်" : "Remaining"}</div>
                  <div className={`text-xl font-bold tabular-nums ${quotaExhausted || noSubscription ? "text-destructive" : "text-foreground"}`}>
                    {quotas ? remaining.toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              {noSubscription ? (
                <Button onClick={() => { onOpenChange(false); navigate("/pricing"); }} className="w-full rounded-xl">
                  {lang === "my" ? "Plan ရွေးမည်" : "Choose a plan"}
                </Button>
              ) : quotaExhausted ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {isQuotaUnlock
                        ? (lang === "my" ? "Unlock လက်ကျန် မရှိတော့ပါ။ Unlock pack ထပ်ဝယ်ပါ။" : "You're out of unlocks. Buy an unlock pack to continue.")
                        : (lang === "my" ? "Featured slot မရှိတော့ပါ။ Featured Job add-on ထပ်ဝယ်ပါ။" : "No featured slots left. Buy a Featured Job add-on.")}
                    </span>
                  </div>
                  <Button onClick={() => { onOpenChange(false); navigate("/pricing"); }} className="w-full rounded-xl">
                    {isQuotaUnlock
                      ? (lang === "my" ? "Unlock Pack ဝယ်မည်" : "Buy unlock pack")
                      : (lang === "my" ? "Featured Job ဝယ်မည်" : "Buy featured slot")}
                  </Button>
                </>
              ) : (
                <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary">
                  {busy ? "..." : (isQuotaUnlock
                    ? (lang === "my" ? "1 Unlock သုံး၍ ဖွင့်မည်" : "Confirm — use 1 unlock")
                    : (lang === "my" ? "1 Slot သုံး၍ Featured လုပ်မည်" : "Confirm — use 1 featured slot"))}
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
