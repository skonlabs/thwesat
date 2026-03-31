import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import heroPattern from "@/assets/hero-pattern.jpg";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const Welcome = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-[0.06]">
        <img src={heroPattern} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="relative z-10 mt-6 self-end px-6">
        <LanguageToggle variant="icon" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <img src={logo} alt="ThweSone" width={120} height={120} className="mx-auto mb-6" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-gradient-gold mb-2 text-4xl font-bold">
          ThweSone
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="mb-2 text-lg font-medium text-foreground">
          သွေးဆက်
        </motion.p>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mb-8 max-w-xs text-sm text-muted-foreground">
          {lang === "my"
            ? "မြန်မာ့ကျွမ်းကျင်ပညာရှင်များအတွက် အလုပ်အကိုင်နှင့် အခွင့်အလမ်းများ ချိတ်ဆက်ပေးသည့် ပလက်ဖောင်း"
            : "A platform connecting Myanmar's scattered talent with remote work opportunities and career resources"}
        </motion.p>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="mb-12 text-xs text-muted-foreground/70">
          {lang === "my"
            ? "Connecting Myanmar's Scattered Talent. Building Careers Beyond Borders."
            : "Connecting Myanmar's Scattered Talent. Building Careers Beyond Borders."}
        </motion.p>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="relative z-10 w-full px-6 pb-12">
        <Button variant="gold" size="xl" className="mb-4 w-full rounded-2xl" onClick={() => navigate("/onboarding")}>
          {lang === "my" ? "စတင်ရန်" : "Get Started"}
        </Button>
        <Button variant="ghost" size="default" className="w-full text-muted-foreground" onClick={() => navigate("/login")}>
          {lang === "my" ? "အကောင့်ရှိပြီးသား? ဝင်ရောက်ရန်" : "Already have an account? Sign In"}
        </Button>
      </motion.div>
    </div>
  );
};

export default Welcome;
