import { motion } from "framer-motion";
import { ArrowLeft, Check, Star, Briefcase, Users, Sparkles, Shield, MessageCircle, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free", nameMm: "အခမဲ့", price: "$0", period: "/forever",
    features: [
      { text: "အလုပ် ကြည့်ရှုရန်", textEn: "Browse jobs", included: true },
      { text: "အခြေခံ ပရိုဖိုင်", textEn: "Basic profile", included: true },
      { text: "လမ်းညွှန်ချက်များ ဖတ်ရှုရန်", textEn: "Read legal guides", included: true },
      { text: "AI Profile Builder", textEn: "AI-powered tools", included: false },
      { text: "Mentor ချိတ်ဆက်", textEn: "Connect with mentors", included: false },
      { text: "E2E Encrypted Chat", textEn: "Secure messaging", included: false },
    ],
    current: true, highlight: false
  },
  {
    name: "Premium", nameMm: "ပရီမီယံ", price: "$5", period: "/month",
    badge: "Founding Rate · ကနဦး နှုန်း",
    features: [
      { text: "Free ပါဝင်သမျှ", textEn: "Everything in Free", included: true },
      { text: "AI Profile Builder", textEn: "AI-powered career tools", included: true },
      { text: "Mentor ချိတ်ဆက် (အကန့်အသတ်မဲ့)", textEn: "Unlimited mentor connections", included: true },
      { text: "E2E Encrypted Chat", textEn: "Secure messaging", included: true },
      { text: "Job Alert (Telegram + Email)", textEn: "Job alerts via Telegram", included: true },
      { text: "Skills Gap Analysis", textEn: "AI skills analysis", included: true },
    ],
    current: false, highlight: true
  },
];

const Premium = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold">
              <Crown className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Premium သို့ အဆင့်မြှင့်ရန်</h1>
            <p className="mt-1 text-sm text-muted-foreground">Upgrade to unlock all features</p>
          </div>

          {/* Plans */}
          <div className="space-y-4">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-5 ${plan.highlight ? "bg-gradient-gold shadow-gold" : "bg-card shadow-card"}`}
              >
                {plan.badge && (
                  <span className="mb-2 inline-block rounded-full bg-primary-foreground/20 px-3 py-1 text-[10px] font-bold text-primary-foreground">
                    ⭐ {plan.badge}
                  </span>
                )}
                <div className="mb-4 flex items-end gap-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <h2 className={`mb-1 text-base font-bold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                  {plan.name} · {plan.nameMm}
                </h2>

                <ul className="mt-3 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        f.included
                          ? plan.highlight ? "text-primary-foreground" : "text-emerald"
                          : "text-muted-foreground/30"
                      }`} />
                      <div>
                        <p className={`text-xs ${
                          f.included
                            ? plan.highlight ? "text-primary-foreground" : "text-foreground"
                            : "text-muted-foreground/50 line-through"
                        }`}>{f.text}</p>
                        <p className={`text-[10px] ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {f.textEn}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.current ? "outline" : "default"}
                  size="lg"
                  className={`mt-4 w-full rounded-xl ${plan.highlight ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
                  disabled={plan.current}
                >
                  {plan.current ? "လက်ရှိ Plan · Current Plan" : "Premium ယူရန် · Subscribe"}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            PromptPay, Stripe ဖြင့် ငွေပေးချေနိုင်ပါသည် · Accepts PromptPay & Stripe
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;
