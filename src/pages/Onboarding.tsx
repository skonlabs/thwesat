import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Briefcase, Users, Shield, BookOpen, Heart, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const steps = [
  {
    icon: Briefcase,
    titleMm: "အလုပ်အကိုင် ရှာဖွေရန်", titleEn: "Find Remote Work",
    descMm: "ကမ္ဘာတစ်ဝှမ်းမှ Diaspora Safe အလုပ်အကိုင်များကို ရှာဖွေပြီး လျှောက်ထားနိုင်ပါသည်",
    descEn: "Discover verified, diaspora-safe remote jobs worldwide tailored for Myanmar professionals",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    titleMm: "လမ်းညွှန်သူများနှင့် ချိတ်ဆက်ပါ", titleEn: "Connect with Mentors",
    descMm: "အတွေ့အကြုံရှိသော မြန်မာပညာရှင်များထံမှ ၁:၁ လမ်းညွှန်မှုရယူပါ",
    descEn: "Get 1:1 guidance from experienced Myanmar professionals who've been in your shoes",
    color: "bg-emerald/10 text-emerald",
  },
  {
    icon: Shield,
    titleMm: "လုံခြုံစွာ အသုံးပြုပါ", titleEn: "Built for Safety",
    descMm: "ကုဒ်ဝှက်ထားသော မက်ဆေ့ချ်များ၊ အရေးပေါ်ထွက်ခွာမှု၊ ကိုယ်စားလှယ်ဝင်ရောက်ခွင့် — သင့်ဘေးကင်းရေး ဦးစားပေး",
    descEn: "E2E encrypted chat, emergency exit, delegate access — your safety comes first",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BookOpen,
    titleMm: "ဥပဒေရေးရာ လမ်းညွှန်ချက်", titleEn: "Legal Navigation",
    descMm: "နိုင်ငံအလိုက် ဗီဇာ၊ အလုပ်ပါမစ်နှင့် အလိမ်အညာရှောင်ကြဉ်နည်း လမ်းညွှန်ချက်များ",
    descEn: "Country-specific guides for visas, work permits, scam prevention — verified by NGOs",
    color: "bg-gold/10 text-gold-dark",
  },
  {
    icon: Heart,
    titleMm: "အသိုင်းအဝိုင်းနှင့် Career Tools", titleEn: "Community & Career Tools",
    descMm: "အတွေ့အကြုံမျှဝေပါ၊ Profile Builder ဖြင့် သင့်ပရိုဖိုင်ကို နိုင်ငံတကာအဆင့်မီ ပြုလုပ်ပါ",
    descEn: "Share experiences, build your profile with AI tools — all bilingual in Burmese & English",
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
    <div className="flex min-h-screen flex-col bg-background px-6 pt-12">
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
        <Button variant="gold" size="xl" className="w-full rounded-2xl" onClick={handleNext}>
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
