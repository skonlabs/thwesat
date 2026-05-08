import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "thwesat_seeker_welcome_v2";

type Slide = {
  emoji: string;
  kickerEn: string;
  kickerMy: string;
  titleEn: string;
  titleMy: string;
  descEn: string;
  descMy: string;
  ctaEn: string;
  ctaMy: string;
  path: string;
  gradient: string;
  ring: string;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🚀",
    kickerEn: "Welcome",
    kickerMy: "ကြိုဆိုပါသည်",
    titleEn: "Land your dream role 3× faster",
    titleMy: "အိပ်မက်ထဲက အလုပ်ကို ၃ ဆ ပိုမြန်စွာ ရယူပါ",
    descEn: "Real mentors, smart tools, verified jobs. Built for Myanmar professionals going global.",
    descMy: "တကယ့် လမ်းညွှန်များ၊ စမတ်ကိရိယာများ၊ စစ်ဆေးပြီးအလုပ်များ။ ကမ္ဘာ့ဈေးကွက်သို့ သွားမည့် မြန်မာ ပရော်ဖက်ရှင်နယ်များအတွက်။",
    ctaEn: "Show me how",
    ctaMy: "ဘယ်လို ပြသမည်",
    path: "",
    gradient: "from-primary via-primary to-[#2a2456]",
    ring: "ring-accent/40",
    accent: "text-accent",
  },
  {
    emoji: "🎯",
    kickerEn: "1:1 Coaching",
    kickerMy: "တစ်ဦးချင်း လမ်းညွှန်",
    titleEn: "Get coached by people who made it",
    titleMy: "အောင်မြင်ပြီးသူများထံမှ လမ်းညွှန်ခံပါ",
    descEn: "CV reviews, mock interviews, salary negotiation, visa & relocation — book a mentor in your field.",
    descMy: "CV သုံးသပ်မှု၊ မော့ခ်အင်တာဗျူး၊ လစာညှိနှိုင်းမှု၊ ဗီဇာနှင့် ပြောင်းရွှေ့မှု — သင့်နယ်ပယ်က လမ်းညွှန်ကို ဘွတ်ကင်လုပ်ပါ။",
    ctaEn: "Browse mentors",
    ctaMy: "လမ်းညွှန်များ ကြည့်ရန်",
    path: "/mentors",
    gradient: "from-emerald via-emerald to-[#0e6b4f]",
    ring: "ring-emerald/40",
    accent: "text-emerald-foreground",
  },
  {
    emoji: "✨",
    kickerEn: "Career Tools",
    kickerMy: "Career ကိရိယာများ",
    titleEn: "Cover letters & CVs in 30 seconds",
    titleMy: "Cover Letter နှင့် CV ကို စက္ကန့် ၃၀ ဖြင့်",
    descEn: "Tailored applications, polished CVs, LinkedIn summaries, skill-gap plans — generated for each job.",
    descMy: "အလုပ်တစ်ခုစီအတွက် သင့်လျော်သော လျှောက်လွှာ၊ CV၊ LinkedIn အကျဉ်းနှင့် ကျွမ်းကျင်မှု အစီအစဉ်များ။",
    ctaEn: "Try Career Tools",
    ctaMy: "Career Tools စမ်းကြည့်ရန်",
    path: "/ai-tools",
    gradient: "from-accent via-[#f5a93a] to-[#c97a14]",
    ring: "ring-accent/50",
    accent: "text-accent-foreground",
  },
  {
    emoji: "🌏",
    kickerEn: "Verified Jobs",
    kickerMy: "စစ်ဆေးထားသော အလုပ်များ",
    titleEn: "Diaspora-safe jobs across APAC",
    titleMy: "APAC တစ်ဝှမ်း ဘေးကင်းသော အလုပ်များ",
    descEn: "Transparent salaries, remote-friendly, scam-screened. Apply with one tap.",
    descMy: "လစာ ပွင့်လင်း၊ Remote လုပ်နိုင်၊ လိမ်လည်မှု စစ်ဆေးပြီး — တစ်ချက်နှိပ်ရုံဖြင့် လျှောက်ထားပါ။",
    ctaEn: "See open jobs",
    ctaMy: "အလုပ်များ ကြည့်ရန်",
    path: "/jobs",
    gradient: "from-[#1e40af] via-[#2563eb] to-[#0ea5e9]",
    ring: "ring-blue-300/40",
    accent: "text-white",
  },
  {
    emoji: "🛡️",
    kickerEn: "Guides & Safety",
    kickerMy: "လမ်းညွှန်နှင့် လုံခြုံရေး",
    titleEn: "Visa, legal & culture, decoded",
    titleMy: "ဗီဇာ၊ ဥပဒေနှင့် ယဉ်ကျေးမှု — ရှင်းရှင်းလင်းလင်း",
    descEn: "Country-by-country guides on permits, contracts, scams to avoid, and adapting to new workplaces.",
    descMy: "နိုင်ငံအလိုက် အလုပ်ခွင့်၊ စာချုပ်၊ လိမ်လည်မှု ရှောင်ရန်နှင့် အလုပ်ခွင်အသစ်တွင် ပြောင်းလဲနေထိုင်နည်း။",
    ctaEn: "Open the library",
    ctaMy: "စာကြည့်တိုက် ဖွင့်ရန်",
    path: "/guides",
    gradient: "from-[#0f3a2e] via-emerald to-[#34d399]",
    ring: "ring-emerald/40",
    accent: "text-white",
  },
];

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

const SeekerWelcomeTour = ({ forceOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

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
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;
  const isFirst = idx === 0;

  const next = () => {
    if (isLast) return dismiss();
    setIdx((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  const handleCta = () => {
    if (slide.path) {
      dismiss();
      navigate(slide.path);
    } else {
      next();
    }
  };

  return (
    <div className="mb-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${slide.gradient} p-5 shadow-xl ring-1 ${slide.ring}`}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60 && !isLast) next();
            else if (info.offset.x > 60 && !isFirst) setIdx((i) => i - 1);
          }}
        >
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

          {/* header row */}
          <div className="relative flex items-center justify-between">
            <span className={`rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${slide.accent} backdrop-blur-sm`}>
              {lang === "my" ? slide.kickerMy : slide.kickerEn}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label={lang === "my" ? "ပိတ်ရန်" : "Dismiss"}
              className="rounded-full bg-white/10 p-1.5 text-white/80 transition-colors active:bg-white/20"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* hero emoji */}
          <motion.div
            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 14 }}
            className="relative mt-4 mb-3 text-5xl leading-none"
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))" }}
          >
            {slide.emoji}
          </motion.div>

          {/* copy */}
          <h2 className={`relative text-[19px] font-extrabold leading-tight ${slide.accent}`}>
            {lang === "my" ? slide.titleMy : slide.titleEn}
          </h2>
          <p className={`relative mt-1.5 text-[12px] leading-relaxed ${slide.accent} opacity-85`}>
            {lang === "my" ? slide.descMy : slide.descEn}
          </p>

          {/* CTA */}
          <div className="relative mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCta}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-foreground shadow-lg transition-transform active:scale-[0.98]"
            >
              {isLast && !slide.path
                ? (lang === "my" ? "စတင်မယ်" : "Let's go")
                : (lang === "my" ? slide.ctaMy : slide.ctaEn)}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={next}
                className={`rounded-xl bg-white/15 px-3 py-2.5 text-[12px] font-semibold ${slide.accent} backdrop-blur-sm transition-colors active:bg-white/25`}
              >
                {lang === "my" ? "ကျော်" : "Next"}
              </button>
            )}
          </div>

          {/* progress dots */}
          <div className="relative mt-4 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SeekerWelcomeTour;
