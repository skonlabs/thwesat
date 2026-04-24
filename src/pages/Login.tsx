import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import LanguageToggle from "@/components/LanguageToggle";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Rate-limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker when locked out
  useEffect(() => {
    if (lockedUntil !== null) {
      const tick = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setCountdown(0);
          setLockedUntil(null);
          setFailedAttempts(0);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setCountdown(remaining);
        }
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [lockedUntil]);

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil;

  const handleLogin = async () => {
    if (isLockedOut) return;

    setLoginError(null);

    if (!email.trim() || !email.includes("@")) {
      setLoginError(lang === "my" ? "အီးမေးလ် ထည့်ပါ" : "Enter your email");
      return;
    }
    if (!password) {
      setLoginError(lang === "my" ? "စကားဝှက် ထည့်ပါ" : "Enter your password");
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      const next = failedAttempts + 1;
      setFailedAttempts(next);

      // User-friendly error message
      let msg = lang === "my" ? "အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ကန်ပါ" : "Incorrect email or password. Please try again.";
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        msg = lang === "my" ? "အီးမေးလ် အတည်မပြုရသေးပါ" : "Please verify your email before signing in.";
      }

      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
        setLoginError(null); // lockout message shown separately
      } else {
        setLoginError(msg);
      }

      // Also show toast for accessibility
      toast({ title: msg, variant: "destructive" });
      return;
    }

    navigate("/home");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground active:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">{lang === "my" ? "နောက်သို့" : "Back"}</span>
        </button>
        <LanguageToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col">
        <img src={logo} alt="ThweSat" width={56} height={56} className="mb-6" />

        <h1 className="mb-1 text-2xl font-bold text-foreground">{lang === "my" ? "ပြန်လည်ဝင်ရောက်ရန်" : "Sign In"}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{lang === "my" ? "ကြိုဆိုပါသည်" : "Welcome back"}</p>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                value={email}
                onChange={e => { setEmail(e.target.value); setLoginError(null); }}
                type="email"
                placeholder="example@email.com"
                className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30"
                disabled={isLockedOut}
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "စကားဝှက်" : "Password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(null); }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 rounded-xl border-border bg-muted/30 pl-10 pr-10 text-sm focus-visible:ring-primary/30"
                disabled={isLockedOut}
                autoComplete="current-password"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" type="button">
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* Inline error / lockout feedback */}
        {isLockedOut ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {lang === "my"
              ? `ကြိုးစားမှု အကြိမ်အရေ ကျော်လွန်သွားပါပြီ။ ${countdown} စက္ကန့် ကြာမြင့်ပြီးမှ ထပ်ကြိုးစားပါ`
              : `Too many failed attempts. Please wait ${countdown}s before trying again.`}
          </p>
        ) : loginError ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {loginError}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end">
          {/* TODO: "Remember this device" toggle needs backend session/token wiring before it can be re-enabled.
              Storing a flag in localStorage without backend support is misleading, so the toggle is hidden for now. */}
          <button onClick={() => navigate("/forgot-password")} className="text-xs font-semibold text-primary" type="button">
            {lang === "my" ? "စကားဝှက် မေ့နေပါသလား?" : "Forgot password?"}
          </button>
        </div>

        <Button
          variant="default"
          size="lg"
          className="mt-8 w-full rounded-2xl shadow-navy"
          onClick={handleLogin}
          disabled={isLoading || isLockedOut}
        >
          {isLoading ? (lang === "my" ? "ဝင်ရောက်နေသည်..." : "Signing in...") : (lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In")}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {lang === "my" ? "အကောင့်မရှိသေးဘူးလား?" : "Don't have an account?"}{" "}
          <button onClick={() => navigate("/signup")} className="font-semibold text-primary" type="button">
            {lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
