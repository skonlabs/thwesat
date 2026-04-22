import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, X, Sparkles, Plus, Star, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  hasCompany: boolean;
  hasAnyJob: boolean;
  hasAnyApplication: boolean;
}

const STORAGE_KEY = "employer_onboarding_dismissed_v1";

const EmployerOnboardingChecklist = ({ hasCompany, hasAnyJob, hasAnyApplication }: Props) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === user.id) setDismissed(true);
    } catch { /* noop */ }
  }, [user]);

  const dismiss = () => {
    setDismissed(true);
    try { if (user) localStorage.setItem(STORAGE_KEY, user.id); } catch { /* noop */ }
  };

  const steps = [
    {
      key: "company",
      done: hasCompany,
      title: { my: "ကုမ္ပဏီ ပရိုဖိုင် ဖြည့်ရန်", en: "Complete your company profile" },
      desc: { my: "လျှောက်ထားသူများ သင့်ကုမ္ပဏီကို ပိုသိနိုင်ရန်", en: "So applicants know who they're applying to" },
      cta: { my: "ပြင်ဆင်ရန်", en: "Edit Company" },
      onClick: () => navigate("/employer/edit-company"),
      icon: Users,
    },
    {
      key: "post",
      done: hasAnyJob,
      title: { my: "ပထမ အလုပ်ခေါ်စာ တင်ရန်", en: "Post your first job" },
      desc: {
        my: "Featured ဆိုသည်မှာ Pro အစီအစဉ်ဖြင့် ပင်မစာမျက်နှာတွင် ဦးစားပေးဖော်ပြမည့် တံဆိပ်ဖြစ်သည်။",
        en: "Tip: 'Featured' is a Pro-plan badge that highlights your job on the home screen.",
      },
      cta: { my: "အလုပ်တင်ရန်", en: "Post a Job" },
      onClick: () => navigate("/employer/post-job"),
      icon: Plus,
    },
    {
      key: "method",
      done: hasAnyApplication,
      title: { my: "လျှောက်ထားနည်း ရွေးပါ", en: "Pick how applicants will apply" },
      desc: {
        my: "ThweSat မှ (Platform) သို့မဟုတ် External URL / Email မှ ဆုံးဖြတ်နိုင်သည်။",
        en: "Choose Via Platform, External URL, or Via Email when posting/editing a job.",
      },
      cta: { my: "ပြင်ဆင်ရန်" , en: "Manage Listings" },
      onClick: () => navigate("/employer/dashboard"),
      icon: Star,
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const total = steps.length;

  if (dismissed || completed === total) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="mb-4 overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary/5"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button onClick={() => setExpanded(e => !e)} className="flex flex-1 items-center gap-2 text-left">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">
                {lang === "my" ? "အလုပ်ရှင် စတင်လမ်းညွှန်" : "Get started as an employer"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {completed}/{total} {lang === "my" ? "ပြီးစီး" : "complete"}
              </p>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={dismiss} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-t border-border/50">
              <div className="space-y-2 px-4 py-3">
                {steps.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-emerald text-emerald-foreground" : "border border-border bg-card"}`}>
                        {s.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {lang === "my" ? s.title.my : s.title.en}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                          {lang === "my" ? s.desc.my : s.desc.en}
                        </p>
                        {!s.done && (
                          <button onClick={s.onClick} className="mt-1.5 text-[11px] font-semibold text-primary hover:underline">
                            {lang === "my" ? s.cta.my : s.cta.en} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmployerOnboardingChecklist;
