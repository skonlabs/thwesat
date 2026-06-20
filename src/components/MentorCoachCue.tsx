import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, MessageCircleQuestion, Sparkles, Target, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type Variant = "interview" | "general" | "skill" | "letter" | "applied" | "profile";

interface Props {
  variant?: Variant;
  /** Optional context to help mentor pre-read (job title, role, etc.) */
  context?: string;
  className?: string;
}

const COPY: Record<Variant, { titleEn: string; titleMy: string; descEn: string; descMy: string; ctaEn: string; ctaMy: string; icon: typeof GraduationCap }> = {
  interview: {
    titleEn: "Got an interview? Prep with a mentor",
    titleMy: "အင်တာဗျူးခေါ်ခံရပြီလား? လမ်းညွှန်နဲ့ ပြင်ဆင်ပါ",
    descEn: "Mock interviews, salary negotiation tips, and role-specific prep — book a 1:1 session.",
    descMy: "မော့ခ်အင်တာဗျူး၊ လစာညှိနှိုင်းမှု အကြံပြုချက်နှင့် ရာထူးအလိုက် ပြင်ဆင်မှု — တစ်ဦးချင်း ဘွတ်ကင်လုပ်ပါ။",
    ctaEn: "Find an interview coach",
    ctaMy: "အင်တာဗျူး လမ်းညွှန် ရှာပါ",
    icon: MessageCircleQuestion,
  },
  applied: {
    titleEn: "Prepare for the next step",
    titleMy: "နောက်တစ်ဆင့်အတွက် ပြင်ဆင်ပါ",
    descEn: "Work with a mentor on interview practice, follow-up questions, and role-specific preparation.",
    descMy: "အင်တာဗျူးလေ့ကျင့်မှု၊ နောက်ဆက်တွဲမေးခွန်းများနှင့် ရာထူးအလိုက် ပြင်ဆင်မှုများအတွက် လမ်းညွှန်နှင့် ဆွေးနွေးပါ။",
    ctaEn: "Find a mentor",
    ctaMy: "လမ်းညွှန်များ ကြည့်ရန်",
    icon: Sparkles,
  },
  general: {
    titleEn: "Land your role faster with a mentor",
    titleMy: "လမ်းညွှန်နှင့်အတူ အလုပ် ပိုမြန်ဆန်စွာ ရရှိပါ",
    descEn: "Career strategy, CV reviews, and interview practice from professionals already in your field.",
    descMy: "သင့်နယ်ပယ်တွင် လုပ်ကိုင်နေသူများထံမှ အသက်မွေးဝမ်းကျောင်း မဟာဗျူဟာ၊ CV ပြန်လည်သုံးသပ်ခြင်းနှင့် အင်တာဗျူး လေ့ကျင့်မှု။",
    ctaEn: "Browse mentors",
    ctaMy: "လမ်းညွှန်များ ကြည့်ရန်",
    icon: GraduationCap,
  },
  skill: {
    titleEn: "Close the gap faster — 1:1 with a mentor",
    titleMy: "ကွာဟမှုကို ပိုမြန်ဆန်စွာ ဖြည့်ပါ — တစ်ဦးချင်း လမ်းညွှန်",
    descEn: "Get a personalised learning plan from someone who's already mastered these skills.",
    descMy: "ဤကျွမ်းကျင်မှုများကို ကျော်လွန်ပြီးသူထံမှ သင့်အတွက် သီးသန့် သင်ယူမှု အစီအစဉ် ရယူပါ။",
    ctaEn: "Match with a mentor",
    ctaMy: "လမ်းညွှန်တစ်ဦးနှင့် ချိတ်ဆက်ပါ",
    icon: Target,
  },
  letter: {
    titleEn: "Want a mentor to review your application?",
    titleMy: "သင့်လျှောက်လွှာကို လမ်းညွှန်တစ်ဦး စစ်ဆေးပေးစေချင်ပါသလား?",
    descEn: "Get expert feedback on your cover letter and CV before you hit submit.",
    descMy: "သင် တင်ပြခြင်း မပြုမီ သင့် Cover Letter နှင့် CV အပေါ် ကျွမ်းကျင်သူ၏ အကြံပြုချက် ရယူပါ။",
    ctaEn: "Find a mentor",
    ctaMy: "လမ်းညွှန် ရှာပါ",
    icon: GraduationCap,
  },
  profile: {
    titleEn: "Stand out — get a mentor to polish your profile",
    titleMy: "ထူးခြားပါ — သင့်ပရိုဖိုင်ကို လမ်းညွှန်တစ်ဦးနှင့် ပြင်ဆင်ပါ",
    descEn: "Profiles reviewed by a mentor get 3× more recruiter views on average.",
    descMy: "လမ်းညွှန် စစ်ဆေးပြီး ပရိုဖိုင်များသည် ပျမ်းမျှအားဖြင့် ၃ ဆ ပိုမို ကြည့်ရှုခံရသည်။",
    ctaEn: "Browse mentors",
    ctaMy: "လမ်းညွှန်များ ကြည့်ရန်",
    icon: Sparkles,
  },
};

const MentorCoachCue = ({ variant = "general", context, className }: Props) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const c = COPY[variant];
  const Icon = c.icon;

  const handleClick = () => {
    const params = new URLSearchParams();
    if (variant === "interview" || variant === "applied") params.set("focus", "interview");
    if (variant === "skill") params.set("focus", "skills");
    if (variant === "letter") params.set("focus", "application");
    if (variant === "profile") params.set("focus", "profile");
    if (context) params.set("topic", context.slice(0, 80));
    const qs = params.toString();
    navigate(`/mentors${qs ? `?${qs}` : ""}`);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full overflow-hidden rounded-xl border border-emerald/30 bg-gradient-to-br from-emerald/8 via-card to-accent/8 p-4 text-left shadow-card transition-colors active:bg-muted/30 ${className || ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald/15">
          <Icon className="h-5 w-5 text-emerald" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{lang === "my" ? c.titleMy : c.titleEn}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{lang === "my" ? c.descMy : c.descEn}</p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald">
            {lang === "my" ? c.ctaMy : c.ctaEn}
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>
      </div>
    </motion.button>
  );
};

export default MentorCoachCue;
