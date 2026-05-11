import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

interface DashboardHeroProps {
  /** Role label shown above the greeting (e.g. "Employer", "Mentor"). */
  roleLabelEn: string;
  roleLabelMy: string;
  /** Optional one-line subtitle / pitch. */
  subtitleEn?: string;
  subtitleMy?: string;
  /** Optional inline CTA. */
  ctaLabelEn?: string;
  ctaLabelMy?: string;
  ctaPath?: string;
}

const DashboardHero = ({
  roleLabelEn,
  roleLabelMy,
  subtitleEn,
  subtitleMy,
  ctaLabelEn,
  ctaLabelMy,
  ctaPath,
}: DashboardHeroProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const my = lang === "my";

  const hour = new Date().getHours();
  const greetingEn = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetingMy = hour < 12 ? "မင်္ဂလာ နံနက်ခင်း" : hour < 18 ? "မင်္ဂလာ နေ့လည်ခင်း" : "မင်္ဂလာ ညနေခင်း";
  const name = (profile?.display_name || "").split(" ")[0] || (my ? "မိတ်ဆွေ" : "there");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-shell via-shell to-sidebar-accent/80 p-5 text-shell-foreground shadow-card-hover md:p-7 lg:p-8"
    >
      {/* Decorative glows */}
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sidebar-accent blur-3xl opacity-60" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {my ? roleLabelMy : roleLabelEn}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-tight text-shell-foreground md:text-2xl lg:text-3xl">
            {my ? `${greetingMy}၊ ${name}` : `${greetingEn}, ${name}`}
          </h2>
          {(subtitleEn || subtitleMy) && (
            <p className="mt-1.5 text-xs text-shell-foreground/70 md:text-sm lg:text-base lg:max-w-2xl">
              {my ? subtitleMy : subtitleEn}
            </p>
          )}
          {ctaPath && (ctaLabelEn || ctaLabelMy) && (
            <button
              onClick={() => navigate(ctaPath)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground transition-transform hover:-translate-y-px active:translate-y-0"
            >
              {my ? ctaLabelMy : ctaLabelEn}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHero;
