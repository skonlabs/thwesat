import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Pause } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";

type Variant = "seeker" | "agent";

interface Props {
  variant: Variant;
  /** When true, ignore localStorage dismissal and always show (e.g. from Settings "Replay tour"). */
  forceOpen?: boolean;
  onClose?: () => void;
}

const COPY: Record<Variant, { src: string; durationLabel: string; titleEn: string; titleMy: string; descEn: string; descMy: string }> = {
  seeker: {
    src: "/videos/seeker-tour.mp4",
    durationLabel: "45s",
    titleEn: "Take a 45-second tour",
    titleMy: "၄၅ စက္ကန့် လမ်းညွှန် ကြည့်ရန်",
    descEn: "See how mentors, career tools and verified jobs help you land roles faster.",
    descMy: "လမ်းညွှန်များ၊ Career ကိရိယာများနှင့် စစ်ဆေးပြီးအလုပ်များက ဘယ်လို ကူညီပေးနိုင်သည်ကို ကြည့်ပါ။",
  },
  agent: {
    src: "/videos/agent-tour.mp4",
    durationLabel: "45s",
    titleEn: "Take a 45-second tour",
    titleMy: "၄၅ စက္ကန့် လမ်းညွှန် ကြည့်ရန်",
    descEn: "See how to post jobs, manage candidates and earn placement fees end-to-end.",
    descMy: "အလုပ်တင်ခြင်း၊ ကိုယ်စားလှယ်လောင်းများ စီမံခြင်းနှင့် ကော်မရှင် ရယူပုံကို ကြည့်ပါ။",
  },
};

const storageKey = (variant: Variant, userId?: string) => `thwesat_tour_video_${variant}:${userId ?? "anon"}`;

const WelcomeTourVideoCard = ({ variant, forceOpen, onClose }: Props) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const copy = COPY[variant];
  const [dismissed, setDismissed] = useState(true);
  const [playerOpen, setPlayerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setDismissed(false);
      return;
    }
    if (!user?.id) return;
    setDismissed(!!localStorage.getItem(storageKey(variant, user.id)));
  }, [forceOpen, user?.id, variant]);

  const dismiss = (permanent = true) => {
    if (permanent && user?.id && !forceOpen) {
      localStorage.setItem(storageKey(variant, user.id), "1");
    }
    setDismissed(true);
    setPlayerOpen(false);
    onClose?.();
  };

  const openPlayer = () => {
    setPlayerOpen(true);
    setTimeout(() => {
      videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    }, 50);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  if (dismissed && !forceOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[#2a2456] p-4 shadow-card"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={openPlayer}
            aria-label={lang === "my" ? "ဗီဒီယို ဖွင့်ရန်" : "Play tour video"}
            className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-accent shadow-lg transition-transform active:scale-95"
          >
            <Play className="h-6 w-6 text-primary" strokeWidth={2.5} fill="currentColor" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                {copy.durationLabel}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-bold text-primary-foreground">
              {lang === "my" ? copy.titleMy : copy.titleEn}
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-primary-foreground/75">
              {lang === "my" ? copy.descMy : copy.descEn}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={openPlayer}
                className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-primary transition-transform active:scale-95"
              >
                {lang === "my" ? "ကြည့်ရန်" : "Watch tour"}
              </button>
              <button
                type="button"
                onClick={() => dismiss(true)}
                className="text-[11px] font-semibold text-primary-foreground/70 underline-offset-2 active:underline"
              >
                {lang === "my" ? "ထပ်မပြပါနှင့်" : "Don't show again"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(false)}
            aria-label={lang === "my" ? "ပိတ်ရန်" : "Skip"}
            className="rounded-full bg-white/10 p-1.5 text-primary-foreground/80 transition-colors active:bg-white/20"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {playerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4 pb-16"
            onClick={() => setPlayerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPlayerOpen(false)}
                aria-label={lang === "my" ? "ပိတ်ရန်" : "Close"}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-2 text-white"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
              <video
                ref={videoRef}
                src={copy.src}
                className="aspect-video w-full bg-black"
                playsInline
                controls
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div className="flex items-center justify-between gap-2 bg-card p-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={2.5} fill="currentColor" />}
                  {playing ? (lang === "my" ? "ခဏရပ်" : "Pause") : (lang === "my" ? "ဖွင့်" : "Play")}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(true)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground active:bg-muted"
                >
                  {lang === "my" ? "ထပ်မပြပါနှင့်" : "Don't show again"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WelcomeTourVideoCard;
