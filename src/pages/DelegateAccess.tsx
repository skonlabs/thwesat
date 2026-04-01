import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";

const DelegateAccess = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { lang } = useLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "expired">("loading");
  const [tokenData, setTokenData] = useState<{ permissions: string[] | null; expires_at: string } | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus("expired");
        return;
      }
      const { data, error } = await supabase
        .from("delegate_tokens")
        .select("*")
        .eq("token", token)
        .eq("is_revoked", false)
        .maybeSingle();

      if (error || !data) {
        setStatus("expired");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      setTokenData({ permissions: data.permissions, expires_at: data.expires_at });
      setStatus("success");
    };
    verifyToken();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">{lang === "my" ? "ဝင်ရောက်ခွင့် စစ်ဆေးနေပါသည်..." : "Verifying access..."}</p>
      </div>
    );
  }

  if (status === "success") {
    const daysLeft = tokenData ? Math.max(0, Math.ceil((new Date(tokenData.expires_at).getTime() - Date.now()) / 86400000)) : 0;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
          <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
        </motion.div>
        <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "ဝင်ရောက်ခွင့် ရရှိပါပြီ" : "Access Granted"}</h1>
        <p className="mb-1 text-sm text-muted-foreground">
          {lang === "my" ? `ပရိုဖိုင် ပြင်ဆင်ခွင့် · ${daysLeft} ရက်` : `Profile Edit Access · ${daysLeft} days`}
        </p>
        <p className="mb-6 text-xs text-muted-foreground">{lang === "my" ? "ဤ session သည် ပိတ်သွားပါက ထပ်မဝင်နိုင်ပါ" : "This session is stored in memory only"}</p>
        <div className="mb-4 w-full max-w-xs rounded-xl bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <p className="text-xs text-foreground/80">{lang === "my" ? "ဆက်တင်များ + Delegate စီမံခန့်ခွဲမှု ကန့်သတ်ထားပါသည်" : "Settings & Delegate management restricted"}</p>
          </div>
        </div>
        <Button variant="default" size="lg" className="w-full max-w-xs rounded-xl" onClick={() => navigate("/home")}>
          {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Expired / Invalid
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
};

export default DelegateAccess;
