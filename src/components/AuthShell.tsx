import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { useLanguage } from "@/hooks/use-language";
import { Shield, Users, Wallet, CheckCircle2 } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  /** Optional override for desktop side-panel headline. */
  pitchEn?: string;
  pitchMy?: string;
}

const AuthShell = ({ children, pitchEn, pitchMy }: AuthShellProps) => {
  const { lang } = useLanguage();
  const my = lang === "my";

  const trust = [
    { icon: Shield, en: "Verified employers only", my: "အတည်ပြုထား အလုပ်ရှင်များ" },
    { icon: CheckCircle2, en: "Scam-checked listings", my: "လိမ်လည်မှု စစ်ဆေးပြီး" },
    { icon: Users, en: "Mentors who've been there", my: "အတွေ့အကြုံရှိ လမ်းညွှန်များ" },
    { icon: Wallet, en: "Transparent salary ranges", my: "ပွင့်လင်းသော လစာ" },
  ];

  return (
    <div className="min-h-screen w-full bg-background md:grid md:grid-cols-2">
      {/* Desktop brand panel */}
      <aside className="relative hidden overflow-hidden bg-shell text-shell-foreground md:flex md:flex-col md:justify-between md:p-10 lg:p-14">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-sidebar-accent blur-3xl opacity-60" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <img src={logo} alt="ThweSat" width={36} height={36} />
          <span className="font-display text-xl font-semibold tracking-tight">
            <span className="text-shell-foreground">Thwe</span>
            <span className="text-accent">Sat</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {my ? "မြန်မာပရော်ဖက်ရှင်နယ်များအတွက်" : "For Myanmar professionals"}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            {pitchEn && pitchMy
              ? (my ? pitchMy : pitchEn)
              : my
                ? "သင့်အတွက် သင့်တော်တဲ့ အလုပ်ကို ရှာဖွေပါ"
                : "Find the job that fits your life."}
          </h2>
          <p className="mt-4 text-sm text-shell-foreground/70 lg:text-base">
            {my
              ? "လုံခြုံစိတ်ချရသော အလုပ်ခေါ်စာများ၊ လမ်းညွှန်မှုနှင့် အသက်မွေးဝမ်းကျောင်း ကိရိယာများ — တစ်နေရာတည်းတွင်။"
              : "Verified jobs, real mentors, and the career tools you need — all in one place."}
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {trust.map((t) => (
              <li key={t.en} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-accent">
                  <t.icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="text-shell-foreground/85">{my ? t.my : t.en}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-shell-foreground/50">
          © {new Date().getFullYear()} ThweSat
        </p>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col">
        {children}
      </main>
    </div>
  );
};

export default AuthShell;
