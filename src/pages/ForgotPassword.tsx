import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (email.trim()) setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
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
          <Button variant="gold" size="lg" className="w-full rounded-xl" onClick={() => navigate("/login")}>
            {lang === "my" ? "Login သို့ ပြန်သွားရန်" : "Back to Sign In"}
          </Button>
          <button onClick={() => setSent(false)} className="mt-4 text-xs font-medium text-primary">
            {lang === "my" ? "အခြား Email ဖြင့် ထပ်စမ်းကြည့်ရန်" : "Try a different email"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-6">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-muted-foreground">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">{lang === "my" ? "နောက်သို့" : "Back"}</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{lang === "my" ? "စကားဝှက် ပြန်သတ်မှတ်ရန်" : "Reset Password"}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {lang === "my" ? "သင့်အီးမေးလ်ကို ထည့်ပါ။ စကားဝှက်ပြန်သတ်မှတ်ရန် လင့်ခ်ပို့ပေးပါမည်" : "Enter your email and we'll send you a link to reset your password"}
        </p>

        <div className="mb-6">
          <Label className="mb-1.5 text-sm text-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl border-border bg-card pl-10 text-sm" />
          </div>
        </div>

        <Button variant="gold" size="lg" className="w-full rounded-xl" onClick={handleSubmit} disabled={!email.trim()}>
          {lang === "my" ? "လင့်ခ် ပို့ရန်" : "Send Reset Link"}
        </Button>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
