import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Gift, Briefcase, Search, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import logo from "@/assets/logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRole, type UserRole } from "@/hooks/use-role";
import LanguageToggle from "@/components/LanguageToggle";

const PASSWORD_MIN_LENGTH = 8;

/** Returns true if password satisfies all complexity requirements */
function passwordMeetsRequirements(pw: string) {
  return pw.length >= PASSWORD_MIN_LENGTH && /[0-9]/.test(pw);
}

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const { setRole } = useRole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("jobseeker");
  const [isLoading, setIsLoading] = useState(false);

  // Derived password checks
  const pwLongEnough = password.length >= PASSWORD_MIN_LENGTH;
  const pwHasNumber = /[0-9]/.test(password);
  const pwValid = pwLongEnough && pwHasNumber;

  // Auto-fill referral code from URL param
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setShowReferral(true);
    }
  }, [searchParams]);

  const handleSignup = async () => {
    if (!name.trim()) {
      toast({ title: lang === "my" ? "အမည် ထည့်ပါ" : "Enter your name", variant: "destructive" });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ title: lang === "my" ? "အီးမေးလ် မှန်ကန်စွာ ထည့်ပါ" : "Enter a valid email", variant: "destructive" });
      return;
    }
    if (!pwValid) {
      toast({
        title: lang === "my"
          ? "စကားဝှက် အနည်းဆုံး ၈ လုံး နှင့် နံပါတ် တစ်လုံး ပါရမည်"
          : "Password must be at least 8 characters and contain at least one number",
        variant: "destructive",
      });
      return;
    }

    // Validate referral code if provided — case-insensitive comparison
    let referrerId: string | null = null;
    if (referralCode.trim()) {
      const normalized = referralCode.trim().toLowerCase();
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("referral_code", normalized)
        .maybeSingle();
      if (!referrerProfile) {
        const msg = lang === "my" ? "ညွှန်းဆိုကုဒ် မမှန်ကန်ပါ" : "Invalid referral code";
        setReferralError(msg);
        toast({ title: msg, variant: "destructive" });
        return;
      }
      setReferralError(null);
      referrerId = referrerProfile.id;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, name, selectedRole);
    setIsLoading(false);
    if (error) {
      toast({ title: lang === "my" ? "အကောင့်ဖွင့်မှု မအောင်မြင်ပါ" : error.message, variant: "destructive" });
      return;
    }
    // Get the new user and persist role + referral
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      // Save referral code and create referral record — non-blocking, errors are swallowed
      if (referralCode.trim() && referrerId) {
        try {
          await supabase.from("profiles").update({ referred_by: referralCode.trim() }).eq("id", newUser.id);
          // Create referral record with 'completed' status (user signed up successfully)
          const { error: referralInsertError } = await supabase.from("referrals").insert({
            referrer_id: referrerId,
            referred_id: newUser.id,
            referral_code: referralCode.trim(),
            status: "completed",
          });
          if (referralInsertError) {
            throw referralInsertError;
          }
        } catch (referralErr) {
          console.error("Referral record could not be created:", referralErr);
          toast({
            title: "Note: your referral code could not be recorded. Please contact support.",
            variant: "destructive",
          });
        }
      }
      // Persist role to user_roles table via SECURITY DEFINER function.
      // Pass the actual selected role (jobseeker / employer / mentor) so the
      // DB can use it for downstream logic.
      await supabase.rpc("set_user_role", { _user_id: newUser.id, _role: selectedRole });
    }
    setRole(selectedRole);
    navigate(selectedRole === "employer" ? "/employer/onboarding" : selectedRole === "mentor" ? "/mentors/dashboard" : "/home");
  };

  const roles: { value: UserRole; icon: typeof Search; label: { my: string; en: string }; desc: { my: string; en: string } }[] = [
    { value: "jobseeker", icon: Search, label: { my: "အလုပ်ရှာသူ", en: "Job Seeker" }, desc: { my: "အလုပ်ရှာဖွေရန်၊ CV တည်ဆောက်ရန်", en: "Find jobs, build your CV" } },
    { value: "employer", icon: Briefcase, label: { my: "အလုပ်ရှင်", en: "Employer" }, desc: { my: "အလုပ်ကြော်ငြာတင်ရန်၊ ဝန်ထမ်းရှာရန်", en: "Post jobs, find talent" } },
    { value: "mentor", icon: GraduationCap, label: { my: "လမ်းညွှန်သူ", en: "Mentor" }, desc: { my: "အတွေ့အကြုံ မျှဝေပြီး အခကြေးငွေ ရယူပါ", en: "Share experience & earn" } },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground active:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">{lang === "my" ? "နောက်သို့" : "Back"}</span>
        </button>
        <LanguageToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col">
        <img src={logo} alt="ThweSat" width={56} height={56} className="mb-6" />

        <h1 className="mb-1 text-2xl font-bold text-foreground">{lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Create Account"}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{lang === "my" ? "အခမဲ့ဖြစ်ပါသည်" : "It's free"}</p>

        {/* Role Selection */}
        <div className="mb-6">
          <Label className="mb-2.5 block text-xs font-semibold text-foreground">{lang === "my" ? "သင်ဘာအတွက် အသုံးပြုမလဲ?" : "I want to..."}</Label>
          <div className="grid grid-cols-3 gap-2.5">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 transition-all ${
                  selectedRole === r.value
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-card active:bg-muted"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${selectedRole === r.value ? "bg-primary/15" : "bg-muted"}`}>
                  <r.icon className={`h-4 w-4 ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                </div>
                <span className={`text-xs font-semibold ${selectedRole === r.value ? "text-primary" : "text-foreground"}`}>
                  {lang === "my" ? r.label.my : r.label.en}
                </span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">
                  {lang === "my" ? r.desc.my : r.desc.en}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ပြသမည့်အမည်" : "Display Name"}</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={lang === "my" ? "ဥပမာ - မောင်မောင် (ဖန်နာမည်လည်း ရ)" : "e.g. Maung Maung (pseudonyms OK)"} className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30" />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{lang === "my" ? "အမှန်တကယ် နာမည် မဟုတ်လည်း ရပါသည်" : "Can be a pseudonym for your safety"}</p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30" />
            </div>
            {/* Email verification notice */}
            <p className="mt-1 text-[10px] text-muted-foreground">
              {lang === "my"
                ? "အကောင့်ဖွင့်ပြီးနောက် အတည်ပြုချက် အီးမေးလ် ပေးပို့မည်"
                : "A verification email will be sent after sign-up"}
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "စကားဝှက်" : "Password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border bg-muted/30 pl-10 pr-10 text-sm focus-visible:ring-primary/30" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" type="button">
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
            {/* Password complexity helper */}
            <div className="mt-2 space-y-1">
              <RequirementRow
                met={pwLongEnough}
                show={password.length > 0}
                text={lang === "my" ? "အနည်းဆုံး ၈ လုံး" : "At least 8 characters"}
              />
              <RequirementRow
                met={pwHasNumber}
                show={password.length > 0}
                text={lang === "my" ? "နံပါတ် တစ်လုံးပါရမည်" : "At least one number"}
              />
            </div>
          </div>

          {/* Referral Code */}
          {!showReferral ? (
            <button onClick={() => setShowReferral(true)} className="flex items-center gap-2 text-xs font-semibold text-primary" type="button">
              <Gift className="h-3.5 w-3.5" strokeWidth={1.5} />
              {lang === "my" ? "ညွှန်းဆိုကုဒ် ရှိပါသလား?" : "Have a referral code?"}
            </button>
          ) : (
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ညွှန်းဆိုကုဒ် (ရွေးချယ်ပိုင်ခွင့်)" : "Referral Code (Optional)"}</Label>
              <div className="relative">
                <Gift className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  value={referralCode}
                  onChange={e => { setReferralCode(e.target.value.toUpperCase()); setReferralError(null); }}
                  placeholder="TS-XXXXXX"
                  className="h-12 rounded-xl border-border bg-muted/30 pl-10 text-sm uppercase focus-visible:ring-primary/30"
                />
              </div>
              {referralError && (
                <p className="mt-1.5 text-xs font-medium text-destructive">{referralError}</p>
              )}
            </div>
          )}
        </div>

        <Button variant="default" size="lg" className="mt-8 w-full rounded-2xl shadow-navy" onClick={handleSignup} disabled={isLoading}>
          {isLoading ? (lang === "my" ? "ဖန်တီးနေသည်..." : "Creating...") : (lang === "my" ? "အကောင့်ဖွင့်ရန်" : "Sign Up")}
        </Button>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          {lang === "my"
            ? "အကောင့်ဖွင့်ခြင်းဖြင့် ကိုယ်ရေးကာကွယ်မှု မူဝါဒကို သဘောတူပါသည်"
            : "By signing up, you agree to our Privacy Policy"}
        </p>

        <p className="mt-4 mb-8 text-center text-xs text-muted-foreground">
          {lang === "my" ? "အကောင့်ရှိပြီးသား?" : "Already have an account?"}{" "}
          <button onClick={() => navigate("/login")} className="font-semibold text-primary" type="button">
            {lang === "my" ? "ဝင်ရောက်ရန်" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

/** Small inline row showing whether a password requirement is met */
function RequirementRow({ met, show, text }: { met: boolean; show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="h-3 w-3 shrink-0 text-destructive" />
      )}
      <span className={`text-[10px] ${met ? "text-emerald-600" : "text-destructive"}`}>{text}</span>
    </div>
  );
}

export default Signup;
