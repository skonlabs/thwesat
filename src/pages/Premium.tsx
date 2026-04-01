import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";

const plans = [
  {
    id: "free",
    duration: null,
    price: 0,
    totalPrice: 0,
    perMonth: "$0",
    period: { my: "ထာဝရ", en: "forever" },
    name: { my: "အခမဲ့", en: "Free" },
    badge: null,
    save: null,
  },
  {
    id: "3mo",
    duration: 3,
    price: 5,
    totalPrice: 15,
    perMonth: "$5",
    period: { my: "/လ", en: "/mo" },
    name: { my: "၃ လ", en: "3 Months" },
    badge: null,
    save: null,
  },
  {
    id: "6mo",
    duration: 6,
    price: 4.17,
    totalPrice: 25,
    perMonth: "$4.17",
    period: { my: "/လ", en: "/mo" },
    name: { my: "၆ လ", en: "6 Months" },
    badge: { my: "လူကြိုက်များ", en: "Popular" },
    save: { my: "17% သက်သာ", en: "Save 17%" },
  },
  {
    id: "12mo",
    duration: 12,
    price: 3.75,
    totalPrice: 45,
    perMonth: "$3.75",
    period: { my: "/လ", en: "/mo" },
    name: { my: "၁၂ လ", en: "12 Months" },
    badge: { my: "တန်ဖိုးအရှိဆုံး", en: "Best Value" },
    save: { my: "25% သက်သာ", en: "Save 25%" },
  },
];

const freeFeatures = [
  { my: "အလုပ် ကြည့်ရှုရန်နှင့် လျှောက်ထားရန်", en: "Browse & apply for jobs" },
  { my: "အခြေခံ ပရိုဖိုင်", en: "Basic profile" },
  { my: "ဥပဒေ လမ်းညွှန်ချက်များ ဖတ်ရှုရန်", en: "Read legal guides" },
  { my: "Community ပါဝင်ရန်", en: "Join community" },
  { my: "Profile Builder (၁ ကြိမ်)", en: "Profile Builder (1 use)" },
];

const premiumFeatures = [
  { my: "Profile Builder (အကန့်အသတ်မဲ့)", en: "Unlimited Profile Builder" },
  { my: "Cover Letter ဖန်တီးရေး", en: "Cover Letter Generator" },
  { my: "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ", en: "Skill Gap Analysis" },
  { my: "Mentor ၁:၁ ချိတ်ဆက် (အကန့်အသတ်မဲ့)", en: "Unlimited 1:1 mentor connections" },
  { my: "ကုဒ်ဝှက် Chat", en: "E2E Encrypted Chat" },
  { my: "အလုပ်သတိပေး (Telegram + Email)", en: "Job alerts via Telegram & Email" },
  { my: "စာရွက်စာတမ်း သိုလှောင်ခန်း", en: "Document Vault" },
];

const Premium = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const [selected, setSelected] = useState("6mo");
  const isPremium = profile?.is_premium;

  const handleSubscribe = () => {
    // TODO: integrate with payment
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရီမီယံ" : "Premium"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Crown className="h-7 w-7 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground">
              {lang === "my" ? "အင်္ဂါရပ်များ အားလုံးကို အသုံးပြုရန်" : "Unlock all features"}
            </p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map((plan, i) => {
              const isFree = plan.id === "free";
              const isSelected = selected === plan.id;
              const isCurrent = isFree && !isPremium;

              return (
                <motion.button
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setSelected(plan.id)}
                  className={`relative w-full rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-gold"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {lang === "my" ? plan.badge.my : plan.badge.en}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {lang === "my" ? plan.name.my : plan.name.en}
                      </h3>
                      {plan.save && (
                        <span className="mt-0.5 inline-block rounded-full bg-emerald/20 px-2 py-0.5 text-[10px] font-bold text-emerald">
                          {lang === "my" ? plan.save.my : plan.save.en}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {isFree ? (
                        <span className="text-xl font-bold text-foreground">$0</span>
                      ) : (
                        <>
                          <span className="text-xl font-bold text-foreground">{plan.perMonth}</span>
                          <span className="text-xs text-muted-foreground">{lang === "my" ? plan.period.my : plan.period.en}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {lang === "my" ? `စုစုပေါင်း $${plan.totalPrice}` : `$${plan.totalPrice} total`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {lang === "my" ? "လက်ရှိ Plan" : "Current Plan"}
                    </span>
                  )}

                  {/* radio indicator */}
                  <div className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Features comparison */}
          <div className="mt-6 space-y-4">
            {/* Free features */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "my" ? "အခမဲ့ အင်္ဂါရပ်များ" : "Free Features"}
              </h3>
              <ul className="space-y-2">
                {freeFeatures.map((f, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.5} />
                    <span className="text-xs text-foreground">{lang === "my" ? f.my : f.en}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium features */}
            <div className="rounded-2xl border border-primary bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {lang === "my" ? "ပရီမီယံ အင်္ဂါရပ်များ" : "Premium Features"}
                </h3>
              </div>
              <ul className="space-y-2">
                {premiumFeatures.map((f, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="text-xs text-foreground">{lang === "my" ? f.my : f.en}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Founding rate badge */}
          <div className="mt-4 rounded-xl bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {lang === "my"
                ? "⭐ ကနဦး နှုန်း — ပထမ ၂၀၀ ဦးသာ"
                : "⭐ Founding Rate — First 200 only"}
            </p>
          </div>

          {/* Subscribe button */}
          <Button
            variant="default"
            size="lg"
            className="mt-4 w-full rounded-xl"
            disabled={selected === "free"}
            onClick={handleSubscribe}
          >
            {selected === "free"
              ? (lang === "my" ? "လက်ရှိ Plan" : "Current Plan")
              : (lang === "my"
                ? `${plans.find(p => p.id === selected)?.name.my} Plan ဖြင့် စတင်ရန်`
                : `Start ${plans.find(p => p.id === selected)?.name.en} Plan`)}
          </Button>

          {/* Referral */}
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-foreground">
                {lang === "my" ? "သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုပါ" : "Refer 5 friends"}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lang === "my"
                ? "Premium ၁ လ အခမဲ့ ရယူပါ — ပရိုဖိုင်ရှိ ညွှန်းဆိုကုဒ်ကို မျှဝေပါ"
                : "Get 1 free month of Premium — share your referral code from Profile"}
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            {lang === "my"
              ? "PromptPay QR, Stripe ဖြင့် ငွေပေးချေနိုင်ပါသည်"
              : "Accepts PromptPay QR & Stripe · Cancel anytime"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;
