import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Info } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const GATE_KEY = "site_gate_passed";
const GATE_USER = import.meta.env.VITE_SITE_GATE_USER as string | undefined;
const GATE_PASS = import.meta.env.VITE_SITE_GATE_PASS as string | undefined;

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const SiteGate = ({ children }: { children: React.ReactNode }) => {
  const { lang } = useLanguage();
  const [passed, setPassed] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
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

  if (passed) return <>{children}</>;

  // If env vars are not configured, show an informational message instead of
  // using insecure hardcoded defaults.
  if (!GATE_USER || !GATE_PASS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-xs space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-base font-semibold text-foreground">
            {lang === "my" ? "ဝင်ရောက်ခွင့် မသတ်မှတ်ရသေးပါ" : "Gate Not Configured"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {lang === "my"
              ? "VITE_SITE_GATE_USER နှင့် VITE_SITE_GATE_PASS environment variables သတ်မှတ်ပါ"
              : "Set the VITE_SITE_GATE_USER and VITE_SITE_GATE_PASS environment variables to enable access protection."}
          </p>
        </div>
      </div>
    );
  }

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (username === GATE_USER && password === GATE_PASS) {
      sessionStorage.setItem(GATE_KEY, "1");
      setPassed(true);
    } else {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      setError(true);
      triggerShake();

      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-4px); }
          60%       { transform: translateX(4px); }
          75%       { transform: translateX(-2px); }
          90%       { transform: translateX(2px); }
        }
        .gate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-xs space-y-4 text-center ${shake ? "gate-shake" : ""}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          {lang === "my" ? "ဝင်ရောက်ခွင့် ကာကွယ်ထားသည်" : "Access Protected"}
        </h1>
        <Input
          placeholder={lang === "my" ? "အသုံးပြုသူအမည်" : "Username"}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(false);
          }}
          className="h-11 rounded-xl"
          disabled={isLockedOut}
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder={lang === "my" ? "စကားဝှက်" : "Password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          className="h-11 rounded-xl"
          disabled={isLockedOut}
          autoComplete="current-password"
        />
        {isLockedOut ? (
          <p className="text-xs text-destructive">
            {lang === "my"
              ? `ကြိုးစားမှု အကြိမ်အရေ ကျော်လွန်သွားပါပြီ။ ${countdown} စက္ကန့် ကြာမြင့်ပြီးမှ ထပ်ကြိုးစားပါ`
              : `Too many failed attempts. Please wait ${countdown}s before trying again.`}
          </p>
        ) : error ? (
          <p className="text-xs text-destructive">
            {lang === "my" ? "အချက်အလက် မမှန်ကန်ပါ" : "Invalid credentials"}
            {failedAttempts > 1 && ` (${failedAttempts}/${MAX_ATTEMPTS})`}
          </p>
        ) : null}
        <Button type="submit" className="w-full rounded-xl" disabled={isLockedOut}>
          {lang === "my" ? "ဝင်ရန်" : "Enter"}
        </Button>
      </form>
    </div>
  );
};

export default SiteGate;
