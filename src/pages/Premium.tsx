import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Gift, Sparkles, Shield, Zap, CalendarClock, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionPlans, SubscriptionPlan } from "@/hooks/use-subscription-plans";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentMethodSheet from "@/components/payment/PaymentMethodSheet";

const formatPrice = (price: number, currency: string, lang: string) => {
  if (price === 0) return lang === "my" ? "အခမဲ့" : "$0";
  if (currency === "MMK") {
    const rounded = Math.round(price / 100) * 100;
    return `${rounded.toLocaleString()} ကျပ်`;
  }
  return `$${price.toFixed(2)}`;
};

const formatTotal = (price: number, currency: string, lang: string) => {
  if (currency === "MMK") {
    return `စုစုပေါင်း ${price.toLocaleString()} ကျပ်`;
  }
  return lang === "my" ? `စုစုပေါင်း $${price}` : `$${price} total`;
};

const freeFeatures = [
  { my: "အလုပ် ကြည့်ရှုရန်နှင့် လျှောက်ထားရန်", en: "Browse & apply for jobs" },
  { my: "အခြေခံ ပရိုဖိုင်", en: "Basic profile" },
  { my: "ဥပဒေ လမ်းညွှန်ချက်များ ဖတ်ရှုရန်", en: "Read legal guides" },
  { my: "အသိုင်းအဝိုင်း ပါဝင်ရန်", en: "Join community" },
  { my: "ပရိုဖိုင် တည်ဆောက်ရေး (၁ ကြိမ်)", en: "Profile Builder (1 use)" },
];

const premiumFeatures = [
  { my: "ပရိုဖိုင် တည်ဆောက်ရေး (အကန့်အသတ်မဲ့)", en: "Unlimited Profile Builder" },
  { my: "အလုပ်လျှောက်လွှာ ဖန်တီးရေး", en: "Cover Letter Generator" },
  { my: "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ", en: "Skill Gap Analysis" },
  { my: "လမ်းညွှန် ၁:၁ ချိတ်ဆက် (အကန့်အသတ်မဲ့)", en: "Unlimited 1:1 mentor connections" },
  { my: "အဆုံးမှအဆုံး ကုဒ်ဝှက် စကားပြောခန်း", en: "E2E Encrypted Chat" },
  { my: "အလုပ်သတိပေး (တယ်လီဂရမ် + အီးမေးလ်)", en: "Job alerts via Telegram & Email" },
  { my: "စာရွက်စာတမ်း သိုလှောင်ခန်း", en: "Document Vault" },
];

const formatDate = (d: Date, lang: string) =>
  d.toLocaleDateString(lang === "my" ? "my-MM" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const PlanCard = ({
  plan,
  isSelected,
  onSelect,
  isPremium,
  activePlanId,
  activeEndDate,
  lang,
  index,
}: {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
  isPremium: boolean | null | undefined;
  activePlanId?: string | null;
  activeEndDate?: Date | null;
  lang: string;
  index: number;
}) => {
  const isFree = plan.plan_id === "free";
  const isCurrent = activePlanId
    ? plan.plan_id === activePlanId
    : isFree && !isPremium;
  const isPopular = plan.plan_id === "6mo";
  const badge = lang === "my" ? plan.badge_my : plan.badge_en;
  const save = lang === "my" ? plan.save_label_my : plan.save_label_en;
  const name = lang === "my" ? plan.name_my : plan.name_en;
  const period = lang === "my" ? "/လ" : "/mo";

  const perMonth = plan.duration_months
    ? plan.price / plan.duration_months
    : 0;

  // Projected new end if user stacks this plan onto an active subscription
  const projectedEnd =
    !isFree && !isCurrent && isPremium && activeEndDate && plan.duration_months
      ? addMonths(activeEndDate, plan.duration_months)
      : null;

  return (
    <motion.button
      key={plan.plan_id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.06 }}
      onClick={onSelect}
      className={`relative w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        isCurrent
          ? "border-emerald/40 bg-emerald/5"
          : isSelected
            ? isPopular
              ? "border-accent bg-accent/5 ring-1 ring-accent/30"
              : "border-primary bg-primary/5 ring-1 ring-primary/20"
            : "border-border bg-card hover:border-muted-foreground/20"
      }`}
    >
      {badge && !isCurrent && (
        <span
          className={`absolute -top-2.5 left-4 rounded-full px-3 py-0.5 text-[10px] font-bold ${
            isPopular
              ? "bg-accent text-accent-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {badge}
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-emerald px-3 py-0.5 text-[10px] font-bold text-white">
          {lang === "my" ? "✓ လက်ရှိ အစီအစဉ်" : "✓ Your current plan"}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isSelected
              ? isPopular
                ? "border-accent bg-accent"
                : "border-primary bg-primary"
              : "border-muted-foreground/25"
          }`}
        >
          {isSelected && (
            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{name}</h3>
          {save && !isCurrent && (
            <span className="mt-0.5 inline-block rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
              {save}
            </span>
          )}
          {projectedEnd && (
            <p className="mt-1 text-[10px] font-medium text-primary">
              {lang === "my"
                ? `→ ${formatDate(projectedEnd, lang)} ထိ တိုးချဲ့မည်`
                : `→ Extends until ${formatDate(projectedEnd, lang)}`}
            </p>
          )}
        </div>

        <div className="text-right">
          {isFree ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold text-foreground">
                {formatPrice(0, plan.currency, lang)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold text-foreground">
                  {formatPrice(perMonth, plan.currency, lang)}
                </span>
                <span className="text-[10px] text-muted-foreground">{period}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatTotal(plan.price, plan.currency, lang)}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
};

const Premium = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile, user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const isPremium = profile?.is_premium;
  const { data: plans, isLoading } = useSubscriptionPlans();

  // Fetch active subscription end date so premium users can see when it expires
  const { data: activeSub } = useQuery({
    queryKey: ["my-active-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_type, current_period_end, billing_cycle")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("current_period_end", new Date().toISOString())
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!isPremium,
  });

  const activeEndDate = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end)
    : null;
  const activePlanId = isPremium ? activeSub?.plan_type : null;

  // Default selection: prefer 6mo, but skip the user's current plan
  const effectiveSelected =
    selected ??
    (plans?.find((p) => p.plan_id === "6mo" && p.plan_id !== activePlanId)?.plan_id ||
      plans?.find((p) => p.plan_id !== "free" && p.plan_id !== activePlanId)?.plan_id ||
      "6mo");

  const handleSubscribe = () => {
    if (effectiveSelected === "free") return;
    setPaymentOpen(true);
  };

  const selectedPlan = plans?.find((p) => p.plan_id === effectiveSelected);
  const isExtension = !!isPremium && !!activeEndDate && effectiveSelected !== "free";
  const projectedNewEnd =
    isExtension && selectedPlan?.duration_months && activeEndDate
      ? addMonths(activeEndDate, selectedPlan.duration_months)
      : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရီမီယံ" : "Premium"} showBack />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero */}
          <div className="mb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent via-primary to-primary opacity-90" />
              <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
              <Crown className="relative h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
            </motion.div>
            <h2 className="mb-1 text-lg font-bold text-foreground">
              {isPremium
                ? lang === "my"
                  ? "ပရီမီယံ ကို တိုးချဲ့ပါ"
                  : "Extend your Premium"
                : lang === "my"
                  ? "ပရီမီယံ သို့ အဆင့်မြှင့်ပါ"
                  : "Upgrade to Premium"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === "my"
                ? "အင်္ဂါရပ်များ အားလုံးကို အသုံးပြုပြီး သင့်အသက်မွေးဝမ်းကြောင်းကို အရှိန်မြှင့်ပါ"
                : "Unlock all features & accelerate your career"}
            </p>
          </div>

          {/* Active subscription banner */}
          {isPremium && activeEndDate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center gap-3 rounded-2xl border border-emerald/20 bg-emerald/5 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald/15">
                <CalendarClock className="h-4 w-4 text-emerald" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">
                  {lang === "my" ? "ပရီမီယံ အသုံးပြုနေသည်" : "Premium active"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my"
                    ? `${formatDate(activeEndDate, lang)} ထိ`
                    : `Active until ${formatDate(activeEndDate, lang)}`}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => navigate("/payments/history")}>
                {lang === "my" ? "မှတ်တမ်း" : "History"}
              </Button>
            </motion.div>
          )}

          {/* Stacking explanation — shown when premium */}
          {isPremium && activeEndDate && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={2} />
              <p className="text-[11px] leading-relaxed text-foreground">
                {lang === "my"
                  ? "အသစ် ဝယ်ယူသော အစီအစဉ်သည် လက်ရှိ သက်တမ်းကုန်ပြီးနောက် စတင်ပါမည်။ သင့် ပရီမီယံ ရက်များ မဆုံးရှုံးပါ။"
                  : "Any new plan is added on top of your current period — your remaining premium days are never lost."}
              </p>
            </div>
          )}

          <div className="mb-5 flex items-center justify-center gap-4">
            {[
              { icon: Zap, label: lang === "my" ? "AI ကိရိယာ" : "AI Tools" },
              { icon: Shield, label: lang === "my" ? "ကုဒ်ဝှက်" : "Encrypted" },
              { icon: Sparkles, label: lang === "my" ? "လမ်းညွှန်" : "Mentors" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="flex items-center gap-1.5"
              >
                <item.icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Free tier — what's included today */}
          <motion.details
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mb-3 rounded-2xl border border-border bg-card p-4"
            open
          >
            <summary className="flex cursor-pointer items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>{lang === "my" ? "အခမဲ့ အစီအစဉ်တွင် ပါဝင်သည်" : "Included in Free plan"}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {lang === "my" ? "ကျုံ့/ဖြန့်" : "Toggle"}
              </span>
            </summary>
            <ul className="mt-3 space-y-2">
              {freeFeatures.map((f, j) => (
                <li key={j} className="flex items-center gap-2.5">
                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald/10">
                    <Check className="h-2.5 w-2.5 text-emerald" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {lang === "my" ? f.my : f.en}
                  </span>
                </li>
              ))}
            </ul>
          </motion.details>

          {/* Premium features */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.05] to-accent/[0.05] p-4"
          >
            <div className="mb-3 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {lang === "my" ? "ပရီမီယံဖြင့် ရရှိမည့် အင်္ဂါရပ်များ" : "What you unlock with Premium"}
              </h3>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {premiumFeatures.map((f, j) => (
                <li key={j} className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] leading-snug text-foreground">
                    {lang === "my" ? f.my : f.en}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <p className="mb-3 px-1 text-center text-[10px] text-muted-foreground">
            {lang === "my"
              ? "အောက်တွင် သင့်အတွက် အသင့်တော်ဆုံး အစီအစဉ်ကို ရွေးပါ ↓"
              : "Pick the plan that fits you below ↓"}
          </p>

          {/* Plan cards */}
          <div className="space-y-2.5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
              ))
            ) : (
              plans?.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={effectiveSelected === plan.plan_id}
                  onSelect={() => setSelected(plan.plan_id)}
                  isPremium={isPremium}
                  activePlanId={activePlanId}
                  activeEndDate={activeEndDate}
                  lang={lang}
                  index={i}
                />
              ))
            )}
          </div>

          {/* Subscribe button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5"
          >
            <Button
              variant="default"
              size="lg"
              className="w-full rounded-xl text-sm font-bold"
              disabled={effectiveSelected === "free" || effectiveSelected === activePlanId}
              onClick={handleSubscribe}
            >
              {effectiveSelected === "free"
                ? lang === "my"
                  ? "လက်ရှိ အစီအစဉ်"
                  : "Current Plan"
                : effectiveSelected === activePlanId
                  ? lang === "my"
                    ? "သင့် လက်ရှိ အစီအစဉ်"
                    : "Your current plan"
                  : isExtension
                    ? lang === "my"
                      ? `${selectedPlan?.duration_months} လ တိုးချဲ့ရန်`
                      : `Extend by ${selectedPlan?.duration_months} months`
                    : lang === "my"
                      ? `${selectedPlan?.name_my} အစီအစဉ်ဖြင့် စတင်ရန်`
                      : `Start ${selectedPlan?.name_en} Plan`}
            </Button>

            {projectedNewEnd && (
              <p className="mt-2 text-center text-[11px] font-medium text-foreground">
                {lang === "my"
                  ? `သစ်တင် ကုန်ဆုံးမည့်ရက် — ${formatDate(projectedNewEnd, lang)}`
                  : `New end date — ${formatDate(projectedNewEnd, lang)}`}
              </p>
            )}

            <p className="mt-2 text-center text-[10px] font-medium text-accent">
              {lang === "my"
                ? "⭐ ကနဦး နှုန်း — ပထမ ၂၀၀ ဦးသာ"
                : "⭐ Founding Rate — First 200 only"}
            </p>
          </motion.div>

          {/* Referral */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
                <Gift className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {lang === "my" ? "သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုပါ" : "Refer 5 friends"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "my"
                    ? "ပရီမီယံ ၁ လ အခမဲ့ ရယူပါ"
                    : "Get 1 free month of Premium"}
                </p>
              </div>
            </div>
          </motion.div>

          <p className="mb-2 mt-4 text-center text-[10px] text-muted-foreground">
            {lang === "my"
              ? "KBZPay, WaveMoney, PromptPay, Wise, Payoneer ဖြင့် ငွေပေးချေနိုင်ပါသည် · အချိန်မရွေး ပယ်ဖျက်နိုင်သည်"
              : "Accepts KBZPay, WaveMoney, PromptPay, Wise & Payoneer · Cancel anytime"}
          </p>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-6 rounded-2xl border border-border bg-card px-4"
          >
            <p className="pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {lang === "my" ? "မေးလေ့ရှိသောမေးခွန်းများ" : "Frequently Asked Questions"}
            </p>
            <Accordion type="single" collapsible>
              <AccordionItem value="faq-1">
                <AccordionTrigger className="text-left text-xs font-semibold text-foreground hover:no-underline">
                  {lang === "my" ? "အစီအစဉ် ကုန်ဆုံးသွားသောအခါ ဘာဖြစ်မည်နည်း?" : "What happens when my plan expires?"}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "အခမဲ့ အစီအစဉ်သို့ ပြန်သွားပါမည်။ သင့်ဒေတာများ ထိန်းသိမ်းထားပါသည်။"
                    : "You'll revert to the free plan. Your data is preserved."}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger className="text-left text-xs font-semibold text-foreground hover:no-underline">
                  {lang === "my" ? "အချိန်မရွေး ပယ်ဖျက်နိုင်ပါသလား?" : "Can I cancel anytime?"}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "ဟုတ်ပါသည်။ Support ကို ဆက်သွယ်ပါ သို့မဟုတ် Settings မှ ပယ်ဖျက်ပါ။"
                    : "Yes. Contact support or use Settings to cancel your subscription."}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3" className="border-b-0">
                <AccordionTrigger className="text-left text-xs font-semibold text-foreground hover:no-underline">
                  {lang === "my" ? "မည်သည့် ငွေပေးချေနည်းများ လက်ခံသည်နည်း?" : "What payment methods are accepted?"}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "KBZPay, Wave Pay, Aya Pay, ဘဏ်လွှဲ, Payoneer နှင့် Wise တို့ဖြင့် ငွေပေးချေနိုင်ပါသည်။"
                    : "KBZPay, Wave Pay, Aya Pay, bank transfer, Payoneer, and Wise."}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </motion.div>
      </div>

      <PaymentMethodSheet
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        amount={selectedPlan?.price || 0}
        currency={selectedPlan?.currency || "USD"}
        paymentType="subscription"
        referenceId={selectedPlan?.plan_id}
        onSuccess={() => navigate("/home")}
      />
    </div>
  );
};

export default Premium;
