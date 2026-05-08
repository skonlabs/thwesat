import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Sparkles, Briefcase, Shield, Wallet, X, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "thwesat_seeker_welcome_v1";

type Benefit = {
  icon: typeof GraduationCap;
  bg: string;
  fg: string;
  titleEn: string;
  titleMy: string;
  descEn: string;
  descMy: string;
  path: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: GraduationCap,
    bg: "bg-emerald/15",
    fg: "text-emerald",
    titleEn: "1:1 Mentor Coaching",
    titleMy: "တစ်ဦးချင်း လမ်းညွှန်",
    descEn: "Personalised CV reviews, mock interviews, salary negotiation, visa & relocation guidance — from pros already in your field.",
    descMy: "သင့်နယ်ပယ်က ကျွမ်းကျင်သူများထံမှ CV ပြန်လည်သုံးသပ်မှု၊ မော့ခ် အင်တာဗျူး၊ လစာညှိခြင်း၊ ဗီဇာနှင့် ပြောင်းရွှေ့မှု လမ်းညွှန်မှု။",
    path: "/mentors",
  },
  {
    icon: Sparkles,
    bg: "bg-accent/15",
    fg: "text-gold-dark",
    titleEn: "Career Tools that do the work",
    titleMy: "သင့်အလုပ်ကို လုပ်ပေးသော Career Tools",
    descEn: "Auto-generate tailored cover letters, polished CVs, LinkedIn summaries, and skill-gap plans in seconds.",
    descMy: "Cover Letter များ၊ CV များ၊ LinkedIn အကျဉ်းချုပ်နှင့် ကျွမ်းကျင်မှု အစီအစဉ်များကို စက္ကန့်ပိုင်းအတွင်း ဖန်တီးပါ။",
    path: "/ai-tools",
  },
  {
    icon: Briefcase,
    bg: "bg-primary/10",
    fg: "text-primary",
    titleEn: "Diaspora-safe jobs, hand-picked",
    titleMy: "လုံခြုံစိတ်ချရသော အလုပ်များ",
    descEn: "Browse verified roles across APAC with transparent salary, remote options, and one-tap apply.",
    descMy: "APAC တစ်ဝှမ်း စစ်ဆေးပြီး အလုပ်များကို လစာ၊ Remote စသည့် ရွေးချယ်မှုနှင့်အတူ တစ်ချက်နှိပ်ရုံဖြင့် လျှောက်ထားပါ။",
    path: "/jobs",
  },
  {
    icon: Shield,
    bg: "bg-emerald/15",
    fg: "text-emerald",
    titleEn: "Visa, legal & culture guides",
    titleMy: "ဗီဇာ၊ ဥပဒေနှင့် ယဉ်ကျေးမှု လမ်းညွှန်",
    descEn: "Country-specific guides on work permits, contracts, scams to avoid, and adapting to local company culture.",
    descMy: "နိုင်ငံအလိုက် အလုပ်ခွင့်ပြုချက်၊ စာချုပ်များ၊ လိမ်လည်မှု ရှောင်ရန်နှင့် ကုမ္ပဏီယဉ်ကျေးမှုအပေါ် လမ်းညွှန်မှု။",
    path: "/guides",
  },
  {
    icon: Wallet,
    bg: "bg-accent/15",
    fg: "text-gold-dark",
    titleEn: "Earn from referrals",
    titleMy: "မိတ်ဆက်မှုဖြင့် ဝင်ငွေရရှိပါ",
    descEn: "Invite friends and earn credits you can spend on coaching sessions and premium tools.",
    descMy: "သူငယ်ချင်းများကို ဖိတ်ခေါ်ပြီး လမ်းညွှန်ချိန်းဆိုမှုနှင့် Tools များအတွက် Credit ရယူပါ။",
    path: "/finance",
  },
];

interface Props {
  /** force-show regardless of dismissed state (e.g. "What's included" button) */
  forceOpen?: boolean;
  onClose?: () => void;
}

const SeekerWelcomeTour = ({ forceOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (!user?.id) return;
    const key = `${STORAGE_KEY}:${user.id}`;
    if (!localStorage.getItem(key)) setOpen(true);
  }, [forceOpen, user?.id]);

  const dismiss = () => {
    if (user?.id && !forceOpen) {
      localStorage.setItem(`${STORAGE_KEY}:${user.id}`, "1");
    }
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-5 overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/8 via-card to-accent/8 shadow-card"
      >
        <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald">
              {lang === "my" ? "ကြိုဆိုပါသည်" : "Welcome to ThweSone"}
            </p>
            <h2 className="mt-1 text-base font-bold text-foreground">
              {lang === "my"
                ? "သင့်အလုပ်ရရှိရန် နည်းလမ်းအားလုံး"
                : "Everything you need to land your next role"}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={lang === "my" ? "ပိတ်ရန်" : "Dismiss"}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors active:bg-muted"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-2 px-4 pb-3">
          {BENEFITS.map((b, i) => (
            <motion.button
              key={b.path + b.titleEn}
              type="button"
              onClick={() => navigate(b.path)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-colors active:bg-muted/40"
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${b.bg}`}>
                <b.icon className={`h-4.5 w-4.5 ${b.fg}`} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{lang === "my" ? b.titleMy : b.titleEn}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {lang === "my" ? b.descMy : b.descEn}
                </p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
            </motion.button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-muted-foreground"
          >
            {lang === "my" ? "နောက်မှ ကြည့်မည်" : "Maybe later"}
          </button>
          <button
            type="button"
            onClick={() => {
              dismiss();
              navigate("/profile/edit");
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-navy transition-colors active:bg-primary/90"
          >
            {lang === "my" ? "ပရိုဖိုင် ဖြည့်ရန်" : "Complete my profile"}
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SeekerWelcomeTour;
