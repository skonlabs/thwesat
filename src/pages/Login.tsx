import { useState } from "react";
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

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast({ title: lang === "my" ? "အီးမေးလ် ထည့်ပါ" : "Enter your email", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: lang === "my" ? "စကားဝှက် ထည့်ပါ" : "Enter your password", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: lang === "my" ? "ဝင်ရောက်မှု မအောင်မြင်ပါ" : error.message, variant: "destructive" });
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
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "စကားဝှက်" : "Password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border bg-muted/30 pl-10 pr-10 text-sm focus-visible:ring-primary/30" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setRememberDevice(!rememberDevice)}
            className="flex items-center gap-2"
          >
            <div className={`h-5 w-9 rounded-full transition-colors ${rememberDevice ? "bg-primary" : "bg-muted-foreground/25"}`}>
              <div className={`h-4 w-4 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${rememberDevice ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-xs text-muted-foreground">{lang === "my" ? "ဤစက်ကို မှတ်ထားရန်" : "Remember this device"}</span>
          </button>
          <button onClick={() => navigate("/forgot-password")} className="text-xs font-semibold text-primary">
            {lang === "my" ? "စကားဝှက် မေ့နေပါသလား?" : "Forgot password?"}
          </button>
        </div>

        <Button variant="default" size="lg" className="mt-8 w-full rounded-2xl shadow-navy" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? (lang === "my" ? "ဝင်ရောက်နေသည်..." : "Signing in...") : (lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In")}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {lang === "my" ? "အကောင့်မရှိသေးဘူးလား?" : "Don't have an account?"}{" "}
          <button onClick={() => navigate("/signup")} className="font-semibold text-primary">
            {lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
