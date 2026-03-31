import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

const GATE_KEY = "site_gate_passed";

const SiteGate = ({ children }: { children: React.ReactNode }) => {
  const [passed, setPassed] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (passed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "ts@123") {
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
        <h1 className="text-lg font-semibold text-foreground">Access Protected</h1>
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(false); }}
          className="h-11 rounded-xl"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          className="h-11 rounded-xl"
        />
        {error && <p className="text-xs text-destructive">Invalid credentials</p>}
        <Button type="submit" className="w-full rounded-xl">Enter</Button>
      </form>
    </div>
  );
};

export default SiteGate;
