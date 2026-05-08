import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Briefcase, Users, Shield, BookOpen, Heart, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const steps = [
  {
    icon: Globe,
    titleMm: "ကမ္ဘာတစ်ဝှမ်းရှိ ပရော်ဖက်ရှင်နယ်များအတွက် တည်ဆောက်ထားသည်", titleEn: "Built for Global Professionals",
    descMm: "အလုပ်ရှာသူ၊ အလုပ်ရှင်နှင့် လမ်းညွှန်သူများအားလုံးအတွက် တစ်နေရာတည်း ပလက်ဖောင်း — ကမ္ဘာတစ်ဝှမ်းရှိ ကျွမ်းကျင်သူများကို ချိတ်ဆက်ပေးသည်",
    descEn: "One platform for job seekers, employers, and mentors — connecting talent worldwide",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Briefcase,
    titleMm: "အလုပ်ရှာဖွေ · ကျွမ်းကျင်သူရှာဖွေ", titleEn: "Find Jobs · Find Talent",
    descMm: "အလုပ်ရှာသူများ — အတည်ပြုပြီး Remote အလုပ်များကို ရှာဖွေပါ။ အလုပ်ရှင်များ — ကမ္ဘာတစ်ဝှမ်းမှ ကျွမ်းကျင်ပရော်ဖက်ရှင်နယ်များကို ရှာဖွေငှားရမ်းပါ",
    descEn: "Job seekers — discover verified remote jobs. Employers — find skilled professionals globally",
    color: "bg-gold/10 text-gold-dark",
  },
  {
    icon: Users,
    titleMm: "လမ်းညွှန်ပေးပါ · လမ်းညွှန်ခံပါ", titleEn: "Mentor & Be Mentored",
    descMm: "လမ်းညွှန်သူအဖြစ် သင့်အတွေ့အကြုံကို မျှဝေပါ၊ သို့မဟုတ် အတွေ့အကြုံရင့်သူများထံမှ တစ်ဦးချင်း လမ်းညွှန်မှု ရယူပါ",
    descEn: "Share your expertise as a mentor or get 1:1 guidance from experienced professionals",
    color: "bg-emerald/10 text-emerald",
  },
  {
    icon: Shield,
    titleMm: "ဘေးကင်းလုံခြုံမှုအတွက် တည်ဆောက်ထားသည်", titleEn: "Built for Safety",
    descMm: "End-to-End ကုဒ်ဝှက်ထားသော မက်ဆေ့ချ်များ၊ အရေးပေါ်ထွက်ခွာမှုနှင့် ကိုယ်စားလှယ် ဝင်ရောက်ခွင့် — သင့်ဘေးကင်းလုံခြုံမှုသည် အရေးကြီးဆုံးဖြစ်သည်",
    descEn: "E2E encrypted chat, emergency exit, delegate access — your safety comes first",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Heart,
    titleMm: "အသိုင်းအဝိုင်းနှင့် အသက်မွေးဝမ်းကျောင်း ကိရိယာများ", titleEn: "Community & Career Tools",
    descMm: "ဥပဒေဆိုင်ရာ လမ်းညွှန်ချက်များ၊ ပရိုဖိုင် တည်ဆောက်ရေးနှင့် ကျွမ်းကျင်မှု ကွာဟချက် ဆန်းစစ်မှု — အားလုံးကို မြန်မာ/အင်္ဂလိပ် နှစ်ဘာသာဖြင့် အသုံးပြုနိုင်သည်",
    descEn: "Legal guides, profile builder, skill gap analysis — all bilingual in Burmese & English",
    color: "bg-emerald/10 text-emerald",
  },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/signup");
    }
  };

  const step = steps[currentStep];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-5 pt-12">
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? "w-8 bg-gradient-gold" : i < currentStep ? "w-2 bg-primary/40" : "w-2 bg-muted"}`} />
        ))}
      </div>

      <div className="flex justify-between">
        <LanguageToggle />
        <Button variant="ghost" size="sm" onClick={() => navigate("/signup")} className="text-muted-foreground">
          {lang === "my" ? "ကျော်ရန်" : "Skip"}
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center">
            <div className={`mb-8 rounded-3xl p-6 ${step.color}`}>
              <step.icon className="h-16 w-16" strokeWidth={1.5} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">{lang === "my" ? step.titleMm : step.titleEn}</h2>
            <p className="mb-2 mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{lang === "my" ? step.descMm : step.descEn}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pb-12">
        <Button variant="default" size="xl" className="w-full rounded-2xl shadow-navy" onClick={handleNext}>
          {currentStep < steps.length - 1 ? (
            <>{lang === "my" ? "ဆက်လက်ရန်" : "Next"} <ChevronRight className="ml-1" /></>
          ) : (
            lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Create Account"
          )}
        </Button>

        {/* Safety tip on safety slide */}
        {currentStep === 2 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-[10px] text-muted-foreground">
            💡 {lang === "my" ? "Logo ကို ၃ စက္ကန့် ဖိထားပြီး ချက်ချင်း ထွက်ခွာနိုင်ပါသည်" : "Hold the logo for 3 seconds to instantly sign out and clear all data"}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
