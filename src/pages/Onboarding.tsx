import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Briefcase, Users, Shield, BookOpen } from "lucide-react";

const steps = [
  {
    icon: Briefcase,
    titleMm: "အလုပ်အကိုင် ရှာဖွေရန်",
    titleEn: "Find Remote Work",
    descMm: "ကမ္ဘာတစ်ဝှမ်းမှ အလုပ်အကိုင်များကို ရှာဖွေပြီး လျှောက်ထားနိုင်ပါသည်",
    descEn: "Discover and apply for remote jobs worldwide tailored for Myanmar professionals",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    titleMm: "လမ်းညွှန်သူများနှင့် ချိတ်ဆက်ပါ",
    titleEn: "Connect with Mentors",
    descMm: "အတွေ့အကြုံရှိသော မြန်မာပညာရှင်များထံမှ လမ်းညွှန်မှုရယူပါ",
    descEn: "Get guidance from experienced Myanmar professionals who've been in your shoes",
    color: "bg-emerald/10 text-emerald",
  },
  {
    icon: Shield,
    titleMm: "ဥပဒေရေးရာ လမ်းညွှန်ချက်",
    titleEn: "Legal Navigation",
    descMm: "နိုင်ငံအလိုက် ဗီဇာ၊ အလုပ်ပါမစ်နှင့် တရားဝင်အခြေအနေ လမ်းညွှန်ချက်များ",
    descEn: "Country-specific guides for visas, work permits, and legal status",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BookOpen,
    titleMm: "ကျွမ်းကျင်မှု တိုးတက်ရန်",
    titleEn: "Build Your Profile",
    descMm: "AI အကူအညီဖြင့် သင့်ပရိုဖိုင်ကို နိုင်ငံတကာအဆင့်မီ ပြုလုပ်ပါ",
    descEn: "AI-assisted profile translation to make your skills globally visible",
    color: "bg-gold/10 text-gold-dark",
  },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

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
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-8 bg-gradient-gold"
                : i < currentStep
                ? "w-2 bg-primary/40"
                : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate("/signup")} className="text-muted-foreground">
          ကျော်ရန် · Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`mb-8 rounded-3xl p-6 ${step.color}`}>
              <step.icon className="h-16 w-16" strokeWidth={1.5} />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">
              {step.titleMm}
            </h2>
            <p className="mb-1 text-sm font-medium text-primary">
              {step.titleEn}
            </p>
            <p className="mb-2 mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {step.descMm}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground/70">
              {step.descEn}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div className="pb-12">
        <Button
          variant="gold"
          size="xl"
          className="w-full rounded-2xl"
          onClick={handleNext}
        >
          {currentStep < steps.length - 1 ? (
            <>
              ဆက်လက်ရန် · Next
              <ChevronRight className="ml-1" />
            </>
          ) : (
            "အကောင့်ဖွင့်ရန် · Create Account"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
