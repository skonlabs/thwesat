import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Briefcase, Crown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import PaymentMethodSheet from "@/components/payment/PaymentMethodSheet";

const tiers = [
  {
    id: "basic",
    name: { my: "အခြေခံ", en: "Basic" },
    priceMonthly: 5,
    priceYearly: 60,
    icon: Briefcase,
    features: [
      { my: "အလုပ်ခေါ်စာ ၁ ခု / လ", en: "1 job post per month" },
      { my: "လျှောက်ထားသူ ကြည့်ရှုခွင့်", en: "View applicant profiles" },
      { my: "အခြေခံ ခွဲခြမ်းစိတ်ဖြာ", en: "Basic analytics" },
      { my: "တိုက်ရိုက် မက်ဆေ့ချ် ၁၀/လ", en: "10 direct messages/mo" },
    ],
    notIncluded: [
      { my: "အကန့်အသတ်မရှိ အလုပ်ခေါ်စာ", en: "Unlimited job posts" },
      { my: "ထူးခြား ဖော်ပြမှု", en: "Featured listings" },
      { my: "ကိုယ်စားလှယ် ဒေတာဘေ့စ် ရှာဖွေ", en: "Full database search" },
      { my: "ဦးစားပေး ပံ့ပိုးကူညီမှု", en: "Priority support" },
    ],
  },
  {
    id: "pro",
    name: { my: "ပရို", en: "Pro" },
    priceMonthly: 25,
    priceYearly: 300,
    icon: Crown,
    popular: true,
    features: [
      { my: "အကန့်အသတ်မရှိ အလုပ်ခေါ်စာ", en: "Unlimited job posts" },
      { my: "အလုပ်ခေါ်စာ ထူးခြားဖော်ပြ", en: "Mark jobs as Featured" },
      { my: "အကန့်အသတ်မရှိ မက်ဆေ့ချ်", en: "Unlimited messages" },
      { my: "ကိုယ်စားလှယ် ဒေတာဘေ့စ် ရှာဖွေ", en: "Full database search" },
      { my: "ခွဲခြမ်းစိတ်ဖြာ အပြည့်", en: "Full analytics" },
      { my: "ဦးစားပေး ပံ့ပိုးကူညီမှု", en: "Priority support" },
    ],
    notIncluded: [],
  },
];

const EmployerSubscription = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [selected, setSelected] = useState("pro");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const selectedTier = tiers.find(t => t.id === selected);

  const t = (texts: { my: string; en: string }) => texts[lang];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် အစီအစဉ်" : "Employer Plans"} />
      <div className="px-5">
        <p className="mb-5 text-center text-sm text-muted-foreground">
          {lang === "my" ? "သင့်လုပ်ငန်းအတွက် အသင့်တော်ဆုံး အစီအစဉ်ကို ရွေးပါ" : "Choose the right plan for your hiring needs"}
        </p>

        <div className="mb-3 rounded-xl bg-muted/50 p-2.5 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {lang === "my" ? "နှစ်စဉ် ကြိုတင်ငွေပေးချေ (လစဉ် ကျသင့်ငွေ ဖော်ပြထားသည်)" : "Billed annually (monthly price shown)"}
          </p>
        </div>

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
                  {lang === "my" ? "အကောင်းဆုံး" : "Best Value"}
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <tier.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="text-base font-bold text-foreground">{t(tier.name)}</h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">${tier.priceMonthly}</span>
                  <span className="text-xs text-muted-foreground">/{lang === "my" ? "လ" : "mo"}</span>
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "my" ? `စုစုပေါင်း $${tier.priceYearly}/နှစ်` : `$${tier.priceYearly}/year total`}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {tier.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={2} />
                    <span className="text-xs text-foreground">{t(f)}</span>
                  </div>
                ))}
                {tier.notIncluded.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 opacity-40">
                    <span className="h-3.5 w-3.5 text-center text-xs text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground">{t(f)}</span>
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

        <Button variant="default" size="lg" className="mt-5 w-full rounded-xl" onClick={() => setPaymentOpen(true)}>
          {lang === "my"
            ? `${t(selectedTier?.name ?? { my: "", en: "" })} အစီအစဉ်ဖြင့် စတင်ရန်`
            : `Start ${selectedTier?.name.en} Plan — $${selectedTier?.priceYearly}/yr`}
        </Button>

        <PaymentMethodSheet
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          amount={selectedTier?.priceYearly || 0}
          currency="USD"
          paymentType="employer_subscription"
          referenceId={selected}
          onSuccess={() => navigate("/employer/dashboard")}
        />
      </div>
    </div>
  );
};

export default EmployerSubscription;
