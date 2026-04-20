import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const GATE_KEY = "site_gate_passed";
const GATE_USER = (import.meta.env.VITE_SITE_GATE_USER as string | undefined) || "admin";
const GATE_PASS = (import.meta.env.VITE_SITE_GATE_PASS as string | undefined) || "ts@123";

const SiteGate = ({ children }: { children: React.ReactNode }) => {
  const { lang } = useLanguage();
  const [passed, setPassed] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (passed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === GATE_USER && password === GATE_PASS) {
      sessionStorage.setItem(GATE_KEY, "1");
      setPassed(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4 text-center">
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
        />
        {error && (
          <p className="text-xs text-destructive">
            {lang === "my" ? "အချက်အလက် မမှန်ကန်ပါ" : "Invalid credentials"}
          </p>
        )}
        <Button type="submit" className="w-full rounded-xl">
          {lang === "my" ? "ဝင်ရန်" : "Enter"}
        </Button>
      </form>
    </div>
  );
};

export default SiteGate;
