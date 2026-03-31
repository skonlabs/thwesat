import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background px-6 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">{lang === "my" ? "နောက်သို့" : "Back"}</span>
        </button>
        <LanguageToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col">
        <img src={logo} alt="ThweSone" width={56} height={56} className="mb-6" />

        <h1 className="mb-1 text-2xl font-bold text-foreground">{lang === "my" ? "ပြန်လည်ဝင်ရောက်ရန်" : "Sign In"}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{lang === "my" ? "ကြိုဆိုပါသည်" : "Welcome back"}</p>

        <Button variant="outline" size="lg" className="mb-3 w-full rounded-xl">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {lang === "my" ? "Google ဖြင့် ဝင်ရောက်ရန်" : "Sign in with Google"}
        </Button>

        <div className="mb-6 mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "my" ? "သို့မဟုတ်" : "or"}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" placeholder="example@email.com" className="h-12 rounded-xl border-border bg-card pl-10 text-sm" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "စကားဝှက်" : "Password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border bg-card pl-10 pr-10 text-sm" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/forgot-password")} className="mt-3 self-end text-xs font-medium text-primary">
          {lang === "my" ? "စကားဝှက် မေ့နေပါသလား?" : "Forgot password?"}
        </button>

        <Button variant="gold" size="lg" className="mt-6 w-full rounded-xl" onClick={() => navigate("/home")}>
          {lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {lang === "my" ? "အကောင့်မရှိသေးဘူးလား?" : "Don't have an account?"}{" "}
          <button onClick={() => navigate("/signup")} className="font-medium text-primary">
            {lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
