import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Users, Sparkles, Shield, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const Premium = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleSubscribe = () => {
    toast({
      title: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon",
      description: lang === "my" ? "Stripe / PromptPay ငွေပေးချေမှု မကြာမီ ရရှိနိုင်ပါမည်" : "Stripe & PromptPay payment coming soon",
    });
  };

  const plans = [
    {
      name: "Free", nameLoc: lang === "my" ? "အခမဲ့" : "Free",
      price: "$0", period: lang === "my" ? "ထာဝရ" : "forever",
      features: [
        { text: lang === "my" ? "အလုပ် ကြည့်ရှုရန်နှင့် လျှောက်ထားရန်" : "Browse & apply for jobs", included: true },
        { text: lang === "my" ? "အခြေခံ ပရိုဖိုင်" : "Basic profile", included: true },
        { text: lang === "my" ? "ဥပဒေ လမ်းညွှန်ချက်များ ဖတ်ရှုရန်" : "Read legal guides", included: true },
        { text: lang === "my" ? "Community ပါဝင်ရန်" : "Join community", included: true },
        { text: lang === "my" ? "Profile Builder (၁ ကြိမ်)" : "Profile Builder (1 use)", included: true },
        { text: lang === "my" ? "AI Cover Letter" : "AI Cover Letter", included: false },
        { text: lang === "my" ? "Mentor ၁:၁ ချိတ်ဆက်" : "1:1 Mentor matching", included: false },
        { text: lang === "my" ? "ကုဒ်ဝှက် Chat" : "E2E Encrypted Chat", included: false },
      ],
      current: true, highlight: false
    },
    {
      name: "Premium", nameLoc: lang === "my" ? "ပရီမီယံ" : "Premium",
      price: billingCycle === "monthly" ? "$5" : "$70",
      period: billingCycle === "monthly" ? (lang === "my" ? "/လ" : "/mo") : (lang === "my" ? "/နှစ်" : "/year"),
      badge: lang === "my" ? "⭐ ကနဦး နှုန်း — ပထမ ၂၀၀ ဦးသာ" : "⭐ Founding Rate — First 200 only",
      yearSave: billingCycle === "yearly" ? (lang === "my" ? "၂ လ အခမဲ့" : "2 months free") : null,
      features: [
        { text: lang === "my" ? "Free ပါဝင်သမျှ" : "Everything in Free", included: true },
        { text: lang === "my" ? "Profile Builder (အကန့်အသတ်မဲ့)" : "Unlimited Profile Builder", included: true },
        { text: lang === "my" ? "AI Cover Letter ဖန်တီးရေး" : "AI Cover Letter Generator", included: true },
        { text: lang === "my" ? "AI ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ" : "AI Skill Gap Analysis", included: true },
        { text: lang === "my" ? "Mentor ၁:၁ ချိတ်ဆက် (အကန့်အသတ်မဲ့)" : "Unlimited 1:1 mentor connections", included: true },
        { text: lang === "my" ? "ကုဒ်ဝှက် Chat" : "E2E Encrypted Chat", included: true },
        { text: lang === "my" ? "အလုပ်သတိပေး (Telegram + Email)" : "Job alerts via Telegram & Email", included: true },
        { text: lang === "my" ? "စာရွက်စာတမ်း သိုလှောင်ခန်း" : "Document Vault", included: true },
      ],
      current: false, highlight: true
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "ပရီမီယံ" : "Premium"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Crown className="h-7 w-7 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "Premium သို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{lang === "my" ? "အင်္ဂါရပ်များ အားလုံးကို အသုံးပြုရန်" : "Unlock all features"}</p>
          </div>

          {/* Billing toggle */}
          <div className="mx-auto mb-5 flex w-fit rounded-xl border border-border bg-card p-1">
            <button onClick={() => setBillingCycle("monthly")} className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {lang === "my" ? "လစဉ်" : "Monthly"}
            </button>
            <button onClick={() => setBillingCycle("yearly")} className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {lang === "my" ? "နှစ်စဉ် (-17%)" : "Yearly (-17%)"}
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`rounded-2xl border p-5 ${plan.highlight ? "border-primary bg-primary" : "border-border bg-card"}`}>
                {plan.badge && (
                  <span className={`mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold ${plan.highlight ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}>{plan.badge}</span>
                )}
                <div className="mb-4 flex items-end gap-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{plan.period}</span>
                  {plan.yearSave && (
                    <span className="ml-2 rounded-full bg-emerald/20 px-2 py-0.5 text-[10px] font-bold text-emerald">{plan.yearSave}</span>
                  )}
                </div>
                <h2 className={`mb-1 text-base font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>{plan.name} · {plan.nameLoc}</h2>
                <ul className="mt-3 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.included ? plan.highlight ? "text-primary-foreground" : "text-emerald" : "text-muted-foreground/30"}`} strokeWidth={1.5} />
                      <p className={`text-xs ${f.included ? plan.highlight ? "text-primary-foreground" : "text-foreground" : "text-muted-foreground/50 line-through"}`}>{f.text}</p>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.current ? "outline" : "default"}
                  size="lg"
                  className={`mt-4 w-full rounded-xl ${plan.highlight ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
                  disabled={plan.current}
                  onClick={plan.current ? undefined : handleSubscribe}
                >
                  {plan.current ? (lang === "my" ? "လက်ရှိ Plan" : "Current Plan") : (lang === "my" ? "Premium ယူရန်" : "Subscribe")}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Referral offer */}
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုပါ" : "Refer 5 friends"}</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lang === "my" ? "Premium ၁ လ အခမဲ့ ရယူပါ — ပရိုဖိုင်ရှိ ညွှန်းဆိုကုဒ်ကို မျှဝေပါ" : "Get 1 free month of Premium — share your referral code from Profile"}
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            {lang === "my" ? "PromptPay QR, Stripe ဖြင့် ငွေပေးချေနိုင်ပါသည်" : "Accepts PromptPay QR & Stripe · Cancel anytime"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;
