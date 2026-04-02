import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Gift, Sparkles, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionPlans, SubscriptionPlan } from "@/hooks/use-subscription-plans";
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

const PlanCard = ({
  plan,
  isSelected,
  onSelect,
  isPremium,
  lang,
  index,
}: {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
  isPremium: boolean | null | undefined;
  lang: string;
  index: number;
}) => {
  const isFree = plan.plan_id === "free";
  const isCurrent = isFree && !isPremium;
  const isPopular = plan.plan_id === "6mo";
  const badge = lang === "my" ? plan.badge_my : plan.badge_en;
  const save = lang === "my" ? plan.save_label_my : plan.save_label_en;
  const name = lang === "my" ? plan.name_my : plan.name_en;
  const period = lang === "my" ? "/လ" : "/mo";

  const perMonth = plan.duration_months
    ? plan.price / plan.duration_months
    : 0;

  return (
    <motion.button
      key={plan.plan_id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.06 }}
      onClick={onSelect}
      className={`relative w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        isSelected
          ? isPopular
            ? "border-accent bg-accent/5 ring-1 ring-accent/30"
            : "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-muted-foreground/20"
      }`}
    >
      {badge && (
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{name}</h3>
            {isCurrent && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                {lang === "my" ? "လက်ရှိ" : "Current"}
              </span>
            )}
          </div>
          {save && (
            <span className="mt-0.5 inline-block rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
              {save}
            </span>
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
  const { profile } = useAuth();
  const [selected, setSelected] = useState("6mo");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const isPremium = profile?.is_premium;
  const { data: plans, isLoading } = useSubscriptionPlans();

  const handleSubscribe = () => {
    if (selected === "free") return;
    setPaymentOpen(true);
  };

  const selectedPlan = plans?.find((p) => p.plan_id === selected);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရီမီယံ" : "Premium"} />
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
              {lang === "my" ? "ပရီမီယံ သို့ အဆင့်မြှင့်ပါ" : "Upgrade to Premium"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === "my"
                ? "အင်္ဂါရပ်များ အားလုံးကို အသုံးပြုပြီး သင့်အသက်မွေးဝမ်းကြောင်းကို အရှိန်မြှင့်ပါ"
                : "Unlock all features & accelerate your career"}
            </p>
          </div>

          {/* Highlights strip */}
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
                  isSelected={selected === plan.plan_id}
                  onSelect={() => setSelected(plan.plan_id)}
                  isPremium={isPremium}
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
              disabled={selected === "free"}
              onClick={handleSubscribe}
            >
              {selected === "free"
                ? lang === "my"
                  ? "လက်ရှိ အစီအစဉ်"
                  : "Current Plan"
                : lang === "my"
                  ? `${selectedPlan?.name_my} အစီအစဉ်ဖြင့် စတင်ရန်`
                  : `Start ${selectedPlan?.name_en} Plan`}
            </Button>

            <p className="mt-2 text-center text-[10px] font-medium text-accent">
              {lang === "my"
                ? "⭐ ကနဦး နှုန်း — ပထမ ၂၀၀ ဦးသာ"
                : "⭐ Founding Rate — First 200 only"}
            </p>
          </motion.div>

          {/* Features comparison */}
          <div className="mt-6 space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "my" ? "အခမဲ့ အင်္ဂါရပ်များ" : "Free Features"}
              </h3>
              <ul className="space-y-2.5">
                {freeFeatures.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald/10">
                      <Check className="h-3 w-3 text-emerald" strokeWidth={2} />
                    </div>
                    <span className="text-xs text-foreground">
                      {lang === "my" ? f.my : f.en}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] p-4"
            >
              <div className="mb-3 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {lang === "my" ? "ပရီမီယံ အင်္ဂါရပ်များ" : "Premium Features"}
                </h3>
              </div>
              <ul className="space-y-2.5">
                {premiumFeatures.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" strokeWidth={2} />
                    </div>
                    <span className="text-xs text-foreground">
                      {lang === "my" ? f.my : f.en}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

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
              ? "PromptPay QR, Stripe ဖြင့် ငွေပေးချေနိုင်ပါသည် · အချိန်မရွေး ပယ်ဖျက်နိုင်သည်"
              : "Accepts PromptPay QR & Stripe · Cancel anytime"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;
