import { motion } from "framer-motion";
import { GraduationCap, Users, DollarSign, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const benefits = [
  {
    icon: Users,
    titleEn: "Guide Fellow Myanmar Workers",
    titleMy: "မြန်မာလုပ်သားများကို လမ်းညွှန်ပါ",
    descEn: "Share your experience navigating work abroad and help others avoid common pitfalls.",
    descMy: "ပြည်ပအလုပ်လုပ်ကိုင်ရာတွင် သင့်အတွေ့အကြုံကို မျှဝေပြီး အခြားသူများကို ကူညီပါ။",
  },
  {
    icon: DollarSign,
    titleEn: "Earn From Your Expertise",
    titleMy: "သင့်ကျွမ်းကျင်မှုဖြင့် ဝင်ငွေရယူပါ",
    descEn: "Set your own hourly rate and get paid for mentoring sessions via Wise or Payoneer.",
    descMy: "သင့်နာရီခနှုန်းကို သတ်မှတ်ပြီး Wise သို့မဟုတ် Payoneer ဖြင့် ငွေရယူပါ။",
  },
  {
    icon: Calendar,
    titleEn: "Flexible Schedule",
    titleMy: "လိုက်လျောညီထွေ အချိန်ဇယား",
    descEn: "Choose your available days and manage bookings on your own terms.",
    descMy: "သင့်အဆင်ပြေသော ရက်များကို ရွေးချယ်ပြီး ကိုယ်ပိုင်အချိန်ဇယားဖြင့် စီမံပါ။",
  },
];

const steps = [
  { en: "Set up your mentor profile with expertise & bio", my: "ကျွမ်းကျင်မှုနှင့် အကြောင်းအရာဖြင့် ပရိုဖိုင်ပြင်ဆင်ပါ" },
  { en: "Choose your availability & hourly rate", my: "ရနိုင်ချိန်နှင့် နာရီခနှုန်း ရွေးချယ်ပါ" },
  { en: "Start receiving booking requests", my: "ကြိုတင်မှာယူမှုများ လက်ခံပါ" },
  { en: "Mentor, earn, and make an impact", my: "လမ်းညွှန်ပါ၊ ဝင်ငွေရယူပါ၊ အကျိုးသက်ရောက်မှုဖန်တီးပါ" },
];

const BecomeMentor = () => {
  const { lang } = useLanguage();
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBecomeMentor = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      // Update profile primary_role
      await supabase.from("profiles").update({ primary_role: "mentor" }).eq("id", user.id);

      // Create mentor_profile if it doesn't exist
      const { data: existing } = await supabase
        .from("mentor_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("mentor_profiles").insert({ id: user.id });
      }

      setRole("mentor");
      toast.success(lang === "my" ? "လမ်းညွှန်သူ အဖြစ် ပြောင်းလဲပြီးပါပြီ!" : "You're now a mentor!");
      navigate("/mentors/dashboard");
    } catch {
      toast.error(lang === "my" ? "အမှားတစ်ခု ဖြစ်ပွားပါသည်" : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (role === "mentor") {
    navigate("/mentors/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်သူ ဖြစ်လာပါ" : "Become a Mentor"} backPath="/mentors" />

      <div className="px-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center rounded-2xl bg-gradient-navy px-6 py-8 text-center"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
            <GraduationCap className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-primary-foreground">
            {lang === "my" ? "သင့်အတွေ့အကြုံကို မျှဝေပါ" : "Share Your Experience"}
          </h2>
          <p className="text-sm text-primary-foreground/70">
            {lang === "my"
              ? "မြန်မာလုပ်သားများအတွက် လမ်းညွှန်ပေးပြီး ဝင်ငွေရယူပါ"
              : "Guide Myanmar workers abroad and earn from your expertise"}
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {lang === "my" ? "အကျိုးကျေးဇူးများ" : "Why become a mentor?"}
          </h3>
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <b.icon className="h-5 w-5 text-accent-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{lang === "my" ? b.titleMy : b.titleEn}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{lang === "my" ? b.descMy : b.descEn}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {lang === "my" ? "ဘယ်လိုလုပ်ဆောင်ရမလဲ" : "How it works"}
          </h3>
          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="text-xs text-foreground">{lang === "my" ? step.my : step.en}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-lg border-t border-border bg-card px-5 py-4">
        <Button
          onClick={handleBecomeMentor}
          disabled={loading}
          className="w-full gap-2 rounded-xl text-sm font-semibold"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {lang === "my" ? "လမ်းညွှန်သူ ဖြစ်လာပါ" : "Become a Mentor"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BecomeMentor;
