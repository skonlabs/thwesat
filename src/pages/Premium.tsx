import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const Premium = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const plans = [
    {
      name: "Free", nameLoc: lang === "my" ? "အခမဲ့" : "Free", price: "$0", period: "/forever",
      features: [
        { text: lang === "my" ? "အလုပ် ကြည့်ရှုရန်" : "Browse jobs", included: true },
        { text: lang === "my" ? "အခြေခံ ပရိုဖိုင်" : "Basic profile", included: true },
        { text: lang === "my" ? "လမ်းညွှန်ချက်များ ဖတ်ရှုရန်" : "Read legal guides", included: true },
        { text: "AI Profile Builder", included: false },
        { text: lang === "my" ? "Mentor ချိတ်ဆက်" : "Connect with mentors", included: false },
        { text: "E2E Encrypted Chat", included: false },
      ],
      current: true, highlight: false
    },
    {
      name: "Premium", nameLoc: lang === "my" ? "ပရီမီယံ" : "Premium", price: "$5", period: "/month",
      badge: lang === "my" ? "ကနဦး နှုန်း" : "Founding Rate",
      features: [
        { text: lang === "my" ? "Free ပါဝင်သမျှ" : "Everything in Free", included: true },
        { text: "AI Profile Builder", included: true },
        { text: lang === "my" ? "Mentor ချိတ်ဆက် (အကန့်အသတ်မဲ့)" : "Unlimited mentor connections", included: true },
        { text: "E2E Encrypted Chat", included: true },
        { text: lang === "my" ? "Job Alert (Telegram + Email)" : "Job alerts via Telegram", included: true },
        { text: lang === "my" ? "Skills Gap Analysis" : "AI skills analysis", included: true },
      ],
      current: false, highlight: true
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "Premium" : "Premium"} showBack />
      <div className="px-6">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold">
              <Crown className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "Premium သို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{lang === "my" ? "အင်္ဂါရပ်များ အားလုံးကို အသုံးပြုရန်" : "Unlock all features"}</p>
          </div>

          <div className="space-y-4">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`rounded-2xl p-5 ${plan.highlight ? "bg-gradient-gold shadow-gold" : "bg-card shadow-card"}`}>
                {plan.badge && (
                  <span className="mb-2 inline-block rounded-full bg-primary-foreground/20 px-3 py-1 text-[10px] font-bold text-primary-foreground">⭐ {plan.badge}</span>
                )}
                <div className="mb-4 flex items-end gap-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <h2 className={`mb-1 text-base font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>{plan.name} · {plan.nameLoc}</h2>
                <ul className="mt-3 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.included ? plan.highlight ? "text-primary-foreground" : "text-emerald" : "text-muted-foreground/30"}`} />
                      <p className={`text-xs ${f.included ? plan.highlight ? "text-primary-foreground" : "text-foreground" : "text-muted-foreground/50 line-through"}`}>{f.text}</p>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.current ? "outline" : "default"} size="lg" className={`mt-4 w-full rounded-xl ${plan.highlight ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`} disabled={plan.current}>
                  {plan.current ? (lang === "my" ? "လက်ရှိ Plan" : "Current Plan") : (lang === "my" ? "Premium ယူရန်" : "Subscribe")}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            {lang === "my" ? "PromptPay, Stripe ဖြင့် ငွေပေးချေနိုင်ပါသည်" : "Accepts PromptPay & Stripe"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;
