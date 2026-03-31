import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Gift, Briefcase, Search, GraduationCap } from "lucide-react";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useRole, type UserRole } from "@/hooks/use-role";
import LanguageToggle from "@/components/LanguageToggle";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { setRole } = useRole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("jobseeker");

  const handleSignup = () => {
    if (!name.trim()) {
      toast({ title: lang === "my" ? "အမည် ထည့်ပါ" : "Enter your name", variant: "destructive" });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ title: lang === "my" ? "အီးမေးလ် မှန်ကန်စွာ ထည့်ပါ" : "Enter a valid email", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: lang === "my" ? "စကားဝှက် အနည်းဆုံး ၆ လုံး" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setRole(selectedRole);
    toast({ title: lang === "my" ? "အကောင့် ဖန်တီးပြီးပါပြီ ✓" : "Account created ✓" });
    navigate(selectedRole === "employer" ? "/employer/onboarding" : "/home");
  };

  const roles: { value: UserRole; icon: typeof Search; label: { my: string; en: string }; desc: { my: string; en: string } }[] = [
    { value: "jobseeker", icon: Search, label: { my: "အလုပ်ရှာသူ", en: "Job Seeker" }, desc: { my: "အလုပ်ရှာဖွေရန်၊ CV တည်ဆောက်ရန်", en: "Find jobs, build your CV" } },
    { value: "employer", icon: Briefcase, label: { my: "အလုပ်ရှင်", en: "Employer" }, desc: { my: "အလုပ်ကြော်ငြာတင်ရန်၊ ဝန်ထမ်းရှာရန်", en: "Post jobs, find talent" } },
    { value: "mentor", icon: GraduationCap, label: { my: "Mentor", en: "Mentor" }, desc: { my: "အတွေ့အကြုံ မျှဝေပြီး အခကြေးငွေ ရယူပါ", en: "Share experience & earn" } },
  ];

  return (
    <div className="min-h-screen bg-background px-6 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">{lang === "my" ? "နောက်သို့" : "Back"}</span>
        </button>
        <LanguageToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col">
        <img src={logo} alt="ThweSone" width={56} height={56} className="mb-6" />

        <h1 className="mb-1 text-2xl font-bold text-foreground">{lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Create Account"}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{lang === "my" ? "အခမဲ့ဖြစ်ပါသည်" : "It's free"}</p>

        {/* Role Selection */}
        <div className="mb-6">
          <Label className="mb-2 block text-sm font-semibold text-foreground">{lang === "my" ? "သင်ဘာအတွက် အသုံးပြုမလဲ?" : "I want to..."}</Label>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  selectedRole === r.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card active:bg-muted"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedRole === r.value ? "bg-primary/10" : "bg-muted"}`}>
                  <r.icon className={`h-5 w-5 ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                </div>
                <span className={`text-sm font-semibold ${selectedRole === r.value ? "text-primary" : "text-foreground"}`}>
                  {lang === "my" ? r.label.my : r.label.en}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {lang === "my" ? r.desc.my : r.desc.en}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button variant="outline" size="lg" className="mb-3 w-full rounded-xl">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {lang === "my" ? "Google ဖြင့် ဆက်လက်ရန်" : "Continue with Google"}
        </Button>

        <div className="mb-6 mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "my" ? "သို့မဟုတ်" : "or"}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "ပြသမည့်အမည်" : "Display Name"}</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={lang === "my" ? "ဥပမာ - မောင်မောင် (ဖန်နာမည်လည်း ရ)" : "e.g. Maung Maung (pseudonyms OK)"} className="h-12 rounded-xl border-border bg-card pl-10 text-sm" />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{lang === "my" ? "အမှန်တကယ် နာမည် မဟုတ်လည်း ရပါသည်" : "Can be a pseudonym for your safety"}</p>
          </div>
          <div>
            <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl border-border bg-card pl-10 text-sm" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "စကားဝှက်" : "Password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border bg-card pl-10 pr-10 text-sm" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && password.length < 6 && (
              <p className="mt-1 text-[10px] text-destructive">{lang === "my" ? "အနည်းဆုံး ၆ လုံး လိုအပ်ပါသည်" : "Minimum 6 characters required"}</p>
            )}
          </div>

          {/* Referral Code */}
          {!showReferral ? (
            <button onClick={() => setShowReferral(true)} className="flex items-center gap-2 text-xs font-medium text-primary">
              <Gift className="h-3.5 w-3.5" strokeWidth={1.5} />
              {lang === "my" ? "ညွှန်းဆိုကုဒ် ရှိပါသလား?" : "Have a referral code?"}
            </button>
          ) : (
            <div>
              <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "ညွှန်းဆိုကုဒ် (ရွေးချယ်ပိုင်ခွင့်)" : "Referral Code (Optional)"}</Label>
              <div className="relative">
                <Gift className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="TS-XXXXXX" className="h-12 rounded-xl border-border bg-card pl-10 text-sm uppercase" />
              </div>
            </div>
          )}
        </div>

        <Button variant="gold" size="lg" className="mt-8 w-full rounded-xl" onClick={handleSignup}>
          {lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Sign Up"}
        </Button>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          {lang === "my"
            ? "အကောင့်ဖွင့်ခြင်းဖြင့် ကိုယ်ရေးကာကွယ်မှု မူဝါဒကို သဘောတူပါသည်"
            : "By signing up, you agree to our Privacy Policy"}
        </p>

        <p className="mt-4 mb-8 text-center text-xs text-muted-foreground">
          {lang === "my" ? "အကောင့်ရှိပြီးသား?" : "Already have an account?"}{" "}
          <button onClick={() => navigate("/login")} className="font-medium text-primary">
            {lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
