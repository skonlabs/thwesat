import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_SECONDS = 60;
const RATE_LIMIT_KEY = "thwesat_forgot_pw_sent_at";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore rate-limit state from sessionStorage on mount
  useEffect(() => {
    const storedAt = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (storedAt) {
      const sentAt = parseInt(storedAt, 10);
      const elapsed = Math.floor((Date.now() - sentAt) / 1000);
      const remaining = RATE_LIMIT_SECONDS - elapsed;
      if (remaining > 0) {
        startCountdown(remaining);
      } else {
        sessionStorage.removeItem(RATE_LIMIT_KEY);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = (from: number) => {
    setResendCountdown(from);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          sessionStorage.removeItem(RATE_LIMIT_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);

    if (resendCountdown > 0) return;

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
    startCountdown(RATE_LIMIT_SECONDS);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-background px-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "အီးမေးလ် ပို့ပြီးပါပြီ" : "Email Sent!"}</h1>
          <p className="mb-2 text-sm text-muted-foreground">
            {lang === "my" ? `${email} သို့ စကားဝှက် ပြန်လည်သတ်မှတ်ရန် လင့်ခ် ပို့ပြီးပါပြီ` : `We've sent a password reset link to ${email}`}
          </p>
          <p className="mb-8 text-xs text-muted-foreground">
            {lang === "my" ? "အီးမေးလ်ကို စစ်ဆေးပြီး လင့်ခ်ကို နှိပ်ပါ" : "Check your email and click the reset link"}
          </p>
          <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => navigate("/login")}>
            {lang === "my" ? "ဝင်ရောက်ရန် သို့ ပြန်သွားရန်" : "Back to Sign In"}
          </Button>
          <button
            onClick={() => setSent(false)}
            disabled={resendCountdown > 0}
            className="mt-4 text-xs font-medium text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCountdown > 0
              ? `Resend available in ${resendCountdown}s`
              : (lang === "my" ? "အခြား အီးမေးလ် ဖြင့် ထပ်စမ်းကြည့်ရန်" : "Try a different email")}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-6 pb-24">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground active:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">{lang === "my" ? "နောက်သို့" : "Back"}</span>
        </button>
        <LanguageToggle />
      </div>
      <div className="mb-4" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{lang === "my" ? "စကားဝှက် ပြန်သတ်မှတ်ရန်" : "Reset Password"}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {lang === "my" ? "သင့်အီးမေးလ်ကို ထည့်ပါ။ စကားဝှက်ပြန်သတ်မှတ်ရန် လင့်ခ်ပို့ပေးပါမည်" : "Enter your email and we'll send you a link to reset your password"}
        </p>

        <div className="mb-6">
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(null); }}
              type="email"
              placeholder="example@email.com"
              className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30"
            />
          </div>
          {emailError && (
            <p className="mt-1.5 text-xs font-medium text-destructive">{emailError}</p>
          )}
        </div>

        <Button
          variant="default"
          size="lg"
          className="w-full rounded-2xl shadow-navy"
          onClick={handleSubmit}
          disabled={!email.trim() || isLoading || resendCountdown > 0}
        >
          {isLoading
            ? (lang === "my" ? "ပို့နေသည်..." : "Sending...")
            : resendCountdown > 0
              ? `Resend available in ${resendCountdown}s`
              : (lang === "my" ? "လင့်ခ် ပို့ရန်" : "Send Reset Link")}
        </Button>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
