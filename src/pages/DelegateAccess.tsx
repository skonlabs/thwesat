import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const DelegateAccess = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [status, setStatus] = useState<"landing" | "loading" | "success" | "error" | "expired">("landing");

  const handleEnter = () => {
    setStatus("loading");
    // Simulate token exchange
    setTimeout(() => {
      // For demo, randomly succeed or show different states
      setStatus("success");
    }, 2000);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">{lang === "my" ? "ဝင်ရောက်ခွင့် စစ်ဆေးနေပါသည်..." : "Verifying access..."}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
          <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
        </motion.div>
        <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ဝင်ရောက်ခွင့် ရရှိပါပြီ" : "Access Granted"}</h1>
        <p className="mb-1 text-sm text-muted-foreground">{lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ခွင့် · ၇ ရက်" : "Profile Edit Access · 7 days"}</p>
        <p className="mb-6 text-xs text-muted-foreground">{lang === "my" ? "ဤ session သည် ပိတ်သွားပါက ထပ်မဝင်နိုင်ပါ" : "This session is stored in memory only"}</p>
        <div className="mb-4 w-full max-w-xs rounded-xl bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <p className="text-xs text-foreground/80">{lang === "my" ? "ဆက်တင်များ + Delegate စီမံခန့်ခွဲမှု ကန့်သတ်ထားပါသည်" : "Settings & Delegate management restricted"}</p>
          </div>
        </div>
        <Button variant="gold" size="lg" className="w-full max-w-xs rounded-xl" onClick={() => navigate("/home")}>
          {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
        </motion.div>
        <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "လင့်ခ် သက်တမ်းကုန်ပြီး" : "Link Expired"}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{lang === "my" ? "ဤဝင်ရောက်ခွင့်လင့်ခ် သက်တမ်းကုန်သွားပါပြီ" : "This access link has expired or been revoked"}</p>
        <Button variant="outline" size="lg" className="w-full max-w-xs rounded-xl" onClick={() => navigate("/")}>
          {lang === "my" ? "ပင်မစာမျက်နှာ" : "Go Home"}
        </Button>
      </div>
    );
  }

  // Landing
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-10 w-10 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">ThweSone</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {lang === "my"
            ? "တစ်စုံတစ်ယောက်က သင့်အား ဝင်ရောက်ခွင့် မျှဝေထားပါသည်။ ဆက်လက်ရန် ခလုတ်ကို နှိပ်ပါ။"
            : "Someone shared access with you. Click the button below to continue."}
        </p>

        <div className="mb-6 rounded-xl border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-primary" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium text-foreground">{lang === "my" ? "ကိုယ်ရေး လုံခြုံမှု" : "Privacy Note"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "ဤ session ကို သင့်ဖုန်းတွင်သာ သိမ်းဆည်းပါသည်။ ဝဘ်ဆိုဒ်ပိတ်လျှင် ထပ်ဝင်ရန် မူရင်းလင့်ခ် လိုအပ်ပါသည်။"
                  : "Session stored in memory only. Closing the browser ends access. Original link needed to re-enter."}
              </p>
            </div>
          </div>
        </div>

        <Button variant="gold" size="xl" className="w-full rounded-xl" onClick={handleEnter}>
          {lang === "my" ? "ဝင်ရောက်ရန်" : "Enter"} <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
};

export default DelegateAccess;
