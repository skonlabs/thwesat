import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, Shield, Users, Sparkles } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const slides = [
  {
    icon: Briefcase,
    eyebrowEn: "VERIFIED OPPORTUNITIES",
    eyebrowMy: "အတည်ပြုပြီးသော အလုပ်များ",
    titleEn: "The job that fits your life is here.",
    titleMy: "သင့်ဘဝနှင့် ကိုက်ညီသော အလုပ် ဤနေရာတွင် ရှိသည်။",
    descEn: "Thousands of vetted roles across APAC — local, remote, and diaspora-safe.",
    descMy: "APAC တစ်ဝှမ်းမှ စစ်ဆေးပြီး အလုပ်ထောင်ပေါင်းများစွာ — ပြည်တွင်း၊ Remote၊ နိုင်ငံခြားသို့ ထွက်ခွာသူများအတွက်။",
  },
  {
    icon: Users,
    eyebrowEn: "REAL MENTORS",
    eyebrowMy: "အစစ်အမှန် လမ်းညွှန်သူများ",
    titleEn: "Guidance from people who've made it.",
    titleMy: "အတွေ့အကြုံရှိသူများထံမှ တိုက်ရိုက်လမ်းညွှန်မှု ရယူပါ။",
    descEn: "Book 1:1 sessions with mentors who have walked the path before you.",
    descMy: "သင့်ရှေ့မှ လမ်းလျှောက်ခဲ့သော လမ်းညွှန်သူများနှင့် ၁:၁ ဆွေးနွေးမှု ပြုလုပ်ပါ။",
  },
  {
    icon: Shield,
    eyebrowEn: "SAFETY FIRST",
    eyebrowMy: "လုံခြုံမှု ဦးစားပေး",
    titleEn: "Built to keep you safe.",
    titleMy: "သင့်လုံခြုံမှုကို ဦးစားပေး တည်ဆောက်ထားသည်။",
    descEn: "Encrypted chat, emergency exit, scam-checked listings — your peace of mind, by default.",
    descMy: "ကုဒ်ဝှက်ထား စကားပြောမှု၊ အရေးပေါ်ထွက်ခွာမှု၊ လိမ်လည်မှု စစ်ဆေးပြီး — အခမဲ့ စိတ်ချမ်းသာမှု။",
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const my = lang === "my";

  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const next = () => (isLast ? navigate("/signup") : setStep(step + 1));

  return (
    <div className="landing-dark relative min-h-dvh overflow-hidden bg-shell text-shell-foreground">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[24rem] w-[24rem] rounded-full bg-sidebar-accent/70 blur-[100px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-6 md:max-w-lg md:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ThweSat" width={28} height={28} />
            <span className="font-brand text-base font-semibold">
              <span className="text-shell-foreground">Thwe</span>
              <span className="text-accent">Sat</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => navigate("/signup")}
              className="text-xs font-medium text-shell-foreground/60 transition-colors hover:text-shell-foreground"
            >
              {my ? "ကျော်ရန်" : "Skip"}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-accent" : "bg-shell-foreground/15"
              }`}
            />
          ))}
        </div>

        {/* Slide */}
        <div className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_12px_40px_-12px_hsl(var(--accent)/0.6)]">
                <slide.icon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-accent">
                {my ? slide.eyebrowMy : slide.eyebrowEn}
              </p>
              <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-shell-foreground md:text-[2.5rem]">
                {my ? slide.titleMy : slide.titleEn}
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-shell-foreground/75">
                {my ? slide.descMy : slide.descEn}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTA + social proof */}
        <div className="pb-10">
          <Button
            size="xl"
            onClick={next}
            className="group h-14 w-full rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <span className="text-base font-semibold">
              {isLast ? (my ? "အခမဲ့ စတင်ရန်" : "Create free account") : (my ? "ဆက်လက်ရန်" : "Continue")}
            </span>
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Button>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-shell-foreground/60">
            <Sparkles className="h-3 w-3 text-accent" strokeWidth={2} />
            <span>{my ? "အခမဲ့ · ၂ မိနစ်အတွင်း" : "Free forever · Takes 2 minutes"}</span>
          </div>

          <p className="mt-6 text-center text-xs text-shell-foreground/55">
            {my ? "အကောင့်ရှိပြီးသားလား?" : "Already have an account?"}{" "}
            <button
              onClick={() => navigate("/login")}
              className="font-semibold text-shell-foreground underline-offset-4 hover:underline"
            >
              {my ? "ဝင်ရောက်ရန်" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
