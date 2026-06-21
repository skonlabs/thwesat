import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";
import AuthShell from "@/components/AuthShell";

const PASSWORD_MIN_LENGTH = 8;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checking, setChecking] = useState(true);

  // Supabase places `#access_token=...&type=recovery` in the URL hash and
  // automatically establishes a session via detectSessionInUrl. We just need
  // to wait for that session and confirm it's a recovery session.
  useEffect(() => {
    let mounted = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });
    // Also handle the case where the session is already present
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setHasRecoverySession(true);
      setChecking(false);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const pwLongEnough = password.length >= PASSWORD_MIN_LENGTH;
  const pwHasUpper = /[A-Z]/.test(password);
  const pwHasNumber = /[0-9]/.test(password);
  const pwHasSpecial = SPECIAL_CHAR_REGEX.test(password);
  const pwMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = pwLongEnough && pwHasUpper && pwHasNumber && pwHasSpecial && pwMatch && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    // Sign out so user must log in fresh with new password
    await supabase.auth.signOut();
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <AuthShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center bg-background px-5">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            {lang === "my" ? "လင့်ခ် မမှန်ကန်ပါ" : "Invalid or expired link"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {lang === "my"
              ? "စကားဝှက် ပြန်လည်သတ်မှတ်ရန် လင့်ခ်ကို ထပ်တောင်းပါ။"
              : "Please request a new password reset link."}
          </p>
          <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => navigate("/forgot-password")}>
            {lang === "my" ? "လင့်ခ် ထပ်တောင်းရန်" : "Request new link"}
          </Button>
        </div>
      </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center bg-background px-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">
            {lang === "my" ? "စကားဝှက် ပြောင်းပြီး" : "Password Updated"}
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            {lang === "my"
              ? "စကားဝှက်အသစ်ဖြင့် ဝင်ရောက်ပါ။"
              : "Sign in with your new password."}
          </p>
          <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => navigate("/login")}>
            {lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In"}
          </Button>
        </motion.div>
      </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
    <div className="mx-auto w-full max-w-md flex-1 bg-background px-5 pt-6 pb-24">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-muted-foreground active:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">{lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In"}</span>
        </button>
        <LanguageToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {lang === "my" ? "စကားဝှက်အသစ် သတ်မှတ်ရန်" : "Set New Password"}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {lang === "my"
            ? "အနည်းဆုံး ၈ လုံး၊ စာလုံးကြီး ၁ လုံး၊ နံပါတ် ၁ လုံးနှင့် အထူးအက္ခရာ ၁ လုံး ပါရမည်။"
            : "At least 8 characters with one uppercase letter, one number, and one special character."}
        </p>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {lang === "my" ? "စကားဝှက်အသစ်" : "New Password"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 rounded-xl border-border bg-muted/30 pl-10 pr-10 text-sm focus-visible:ring-primary/30"
                autoComplete="new-password"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
            {/* Password complexity helper */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                <li className={pwLongEnough ? "text-emerald" : "text-muted-foreground"}>
                  {pwLongEnough ? "✓" : "○"} {lang === "my" ? "အနည်းဆုံး ၈ လုံး" : "At least 8 characters"}
                </li>
                <li className={pwHasUpper ? "text-emerald" : "text-muted-foreground"}>
                  {pwHasUpper ? "✓" : "○"} {lang === "my" ? "စာလုံးကြီး တစ်လုံး" : "At least one uppercase letter"}
                </li>
                <li className={pwHasNumber ? "text-emerald" : "text-muted-foreground"}>
                  {pwHasNumber ? "✓" : "○"} {lang === "my" ? "နံပါတ် တစ်လုံး" : "At least one number"}
                </li>
                <li className={pwHasSpecial ? "text-emerald" : "text-muted-foreground"}>
                  {pwHasSpecial ? "✓" : "○"} {lang === "my" ? "အထူးအက္ခရာ တစ်လုံး" : "At least one special character"}
                </li>
              </ul>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {lang === "my" ? "စကားဝှက် အတည်ပြုပါ" : "Confirm Password"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30"
                autoComplete="new-password"
              />
            </div>
            {confirmPassword.length > 0 && !pwMatch && (
              <p className="mt-1.5 text-xs font-medium text-destructive">
                {lang === "my" ? "စကားဝှက် မတူပါ" : "Passwords do not match"}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="default"
          size="lg"
          className="mt-8 w-full rounded-2xl shadow-navy"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isLoading
            ? (lang === "my" ? "ပြောင်းနေသည်..." : "Updating...")
            : (lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Update Password")}
        </Button>
      </motion.div>
    </div>
    </AuthShell>
  );
};

export default ResetPassword;
