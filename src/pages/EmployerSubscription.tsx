import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Building2, Briefcase, Users, Search, Star, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const tiers = [
  {
    id: "basic",
    name: "Basic",
    price: 50,
    icon: Briefcase,
    features: [
      { my: "အလုပ်ခေါ်စာ ၁ ခု", en: "1 active listing" },
      { my: "လျှောက်ထားသူ ကြည့်ရှုခွင့်", en: "View applicant profiles" },
      { my: "အခြေခံ ခွဲခြမ်းစိတ်ဖြာ", en: "Basic analytics" },
    ],
    notIncluded: [
      { my: "တိုက်ရိုက် မက်ဆေ့ချ်", en: "Direct messages" },
      { my: "Featured ဖော်ပြမှု", en: "Featured listings" },
      { my: "ကိုယ်စားလှယ် ရှာဖွေ", en: "Database search" },
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 120,
    icon: Building2,
    popular: true,
    features: [
      { my: "အလုပ်ခေါ်စာ ၃ ခု", en: "3 active listings" },
      { my: "တိုက်ရိုက် မက်ဆေ့ချ် 20/လ", en: "20 direct messages/mo" },
      { my: "လျှောက်ထားသူ ကြည့်ရှုခွင့်", en: "View applicant profiles" },
      { my: "ခွဲခြမ်းစိတ်ဖြာ အပြည့်", en: "Full analytics" },
    ],
    notIncluded: [
      { my: "Featured ဖော်ပြမှု", en: "Featured listings" },
      { my: "ကိုယ်စားလှယ် ရှာဖွေ", en: "Database search" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 300,
    icon: Crown,
    features: [
      { my: "အကန့်အသတ်မရှိ အလုပ်ခေါ်စာ", en: "Unlimited listings" },
      { my: "အကန့်အသတ်မရှိ မက်ဆေ့ချ်", en: "Unlimited messages" },
      { my: "Featured ဖော်ပြမှု", en: "Featured listings" },
      { my: "ကိုယ်စားလှယ် ဒေတာဘေ့စ် ရှာဖွေ", en: "Full database search" },
      { my: "ဦးစားပေး ပံ့ပိုးကူညီမှု", en: "Priority support" },
    ],
    notIncluded: [],
  },
];

const EmployerSubscription = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [selected, setSelected] = useState("standard");

  const handleSubscribe = () => {
    navigate("/employer/dashboard");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် Plan" : "Employer Plans"} />
      <div className="px-5">
        <p className="mb-5 text-center text-sm text-muted-foreground">
          {lang === "my" ? "သင့်လုပ်ငန်းအတွက် အသင့်တော်ဆုံး Plan ကို ရွေးပါ" : "Choose the right plan for your hiring needs"}
        </p>

        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <motion.button
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(tier.id)}
              className={`relative w-full rounded-2xl border p-5 text-left transition-all ${selected === tier.id ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-card"}`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {lang === "my" ? "လူကြိုက်များ" : "Popular"}
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <tier.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="text-base font-bold text-foreground">{tier.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">${tier.price}</span>
                  <span className="text-xs text-muted-foreground">/{lang === "my" ? "လ" : "mo"}</span>
                </div>
              </div>
              <div className="space-y-2">
                {tier.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={2} />
                    <span className="text-xs text-foreground">{lang === "my" ? f.my : f.en}</span>
                  </div>
                ))}
                {tier.notIncluded.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 opacity-40">
                    <span className="h-3.5 w-3.5 text-center text-xs text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground">{lang === "my" ? f.my : f.en}</span>
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {lang === "my" ? "ပထမ ၁၀ ဦး အလုပ်ရှင်များအတွက် ၆၀ ရက် အခမဲ့ အစမ်းသုံးခွင့်" : "60-day free trial for the first 10 employers"}
          </p>
        </div>

        <Button variant="default" size="lg" className="mt-5 w-full rounded-xl" onClick={handleSubscribe}>
          {lang === "my" ? `${tiers.find(t => t.id === selected)?.name} Plan ဖြင့် စတင်ရန်` : `Start ${tiers.find(t => t.id === selected)?.name} Plan`}
        </Button>
      </div>
    </div>
  );
};

export default EmployerSubscription;
