import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Users, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";

const Welcome = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const my = lang === "my";

  const stats = [
    { k: my ? "အလုပ်ခန့်အပ်မှု" : "Placements", v: "2.4k+" },
    { k: my ? "လမ်းညွှန်သူ" : "Mentors", v: "180+" },
    { k: my ? "ကုမ္ပဏီ" : "Companies", v: "320+" },
  ];

  const features = [
    { icon: Briefcase, t: my ? "အလုပ် တိုက်ရိုက်ရှာ" : "Verified jobs", d: my ? "လုံခြုံစိတ်ချရသော အလုပ်ခေါ်စာများ" : "Hand-curated, scam-free postings across APAC." },
    { icon: Users, t: my ? "လမ်းညွှန်" : "1:1 mentorship", d: my ? "ကျွမ်းကျင်သူများနှင့် တိုက်ရိုက်" : "Book sessions with senior pros from your industry." },
    { icon: Sparkles, t: my ? "ကိရိယာများ" : "Career toolkit", d: my ? "CV၊ Cover Letter၊ ကျွမ်းကျင်မှု ခြားနားချက်" : "CV builder, cover letters, and skill gap analysis." },
    { icon: Shield, t: my ? "လုံခြုံမှု" : "Diaspora-safe", d: my ? "မြန်မာ အလုပ်သမားများအတွက် ကာကွယ်မှုများ" : "Built-in safeguards for Myanmar diaspora workers." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8 md:py-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ThweSat" width={36} height={36} />
            <span className="font-display text-xl font-semibold tracking-tight">
              <span className="text-primary">Thwe</span><span className="text-accent">Sat</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageToggle />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => navigate("/login")}>
              {my ? "ဝင်ရောက်ရန်" : "Sign in"}
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={() => navigate("/onboarding")}>
              {my ? "စတင်ရန်" : "Get started"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* editorial background flourishes */}
        <div className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[-15%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-32 md:px-8 md:pb-28 md:pt-40 lg:pt-48">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                {my ? "မြန်မာပရော်ဖက်ရှင်နယ်များအတွက်" : "For Myanmar's working professionals — at home & abroad"}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.7 }}
                className="font-display text-[44px] font-medium leading-[1.02] tracking-tight text-foreground md:text-6xl lg:text-7xl"
              >
                {my ? (
                  <>သင့် အသက်မွေးဝမ်းကျောင်း<br/>
                  <span className="italic text-primary">အသစ်တစ်ခု</span> စတင်ပါ။</>
                ) : (
                  <>Your career,<br/>
                  <span className="italic text-primary">authored</span> with intention.</>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
                className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
              >
                {my
                  ? "ThweSat သည် မြန်မာပရော်ဖက်ရှင်နယ်များအတွက် အလုပ်၊ လမ်းညွှန်မှုနှင့် ကိရိယာများ စုစည်းထားသော တစ်ခုတည်းသော ပလက်ဖောင်း ဖြစ်သည်။"
                  : "One platform to find verified work, learn from senior mentors, and ship a portfolio that actually opens doors."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Button size="lg" className="group rounded-full px-6 shadow-navy" onClick={() => navigate("/onboarding")}>
                  {my ? "အခမဲ့ စတင်ရန်" : "Start free"}
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button size="lg" variant="ghost" className="rounded-full" onClick={() => navigate("/login")}>
                  {my ? "ဝင်ရောက်ရန်" : "I have an account"}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="mt-12 grid max-w-md grid-cols-3 gap-6"
              >
                {stats.map((s) => (
                  <div key={s.k}>
                    <p className="font-display text-2xl font-semibold text-foreground md:text-3xl">{s.v}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.k}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Editorial visual block */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="relative lg:col-span-5"
            >
              <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-gradient-navy p-8 shadow-card-hover">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.35),transparent_60%)]" />
                <div className="relative flex h-full flex-col justify-between text-primary-foreground">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/70">Issue 01</p>
                    <p className="mt-1 text-sm text-primary-foreground/80">{my ? "ဂရုစိုက် တည်ဆောက်ထား" : "Crafted with care"}</p>
                  </div>
                  <div>
                    <p className="font-display text-4xl font-medium leading-tight md:text-5xl">
                      {my ? "ပိုကောင်းသော အလုပ်။ ပိုကောင်းသော ဘဝ။" : "Better work. Better life."}
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent" />
                      <div>
                        <p className="text-sm font-medium">{my ? "ပြောင်းလဲမှု စတင်" : "Begin the change"}</p>
                        <p className="text-xs text-primary-foreground/60">thwesat.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating pull-quote card */}
              <div className="absolute -bottom-6 -left-6 hidden max-w-[220px] rounded-2xl border border-border bg-card p-4 shadow-card-hover md:block">
                <p className="font-display text-sm italic leading-snug text-foreground">
                  "{my ? "သုံးရက်အတွင်း အလုပ်ရရှိခဲ့သည်။" : "Found a role in three days."}"
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">— Hnin, Designer</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <div className="mb-12 max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent">{my ? "အင်္ဂါရပ်များ" : "What's inside"}</p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              {my ? "တစ်နေရာတည်းမှာပဲ၊ အရာအားလုံး။" : "Everything your career needs, in one place."}
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2">
            {features.map((f) => (
              <div key={f.t} className="group bg-card p-8 transition-colors hover:bg-background md:p-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-gold-dark">
                  <f.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-medium tracking-tight">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--gold)/0.25),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center md:px-8 md:py-32">
          <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {my ? "သင့်ပထမအဆင့် ယနေ့ စတင်ပါ။" : "Take the first step today."}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-primary-foreground/75 md:text-lg">
            {my ? "မိနစ်ပိုင်းအတွင်း ပရိုဖိုင် တည်ဆောက်ပြီး အလုပ်ရှာဖွေပါ။" : "Set up your profile in minutes. Discover roles built around the life you want."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" className="rounded-full px-7" onClick={() => navigate("/onboarding")}>
              {my ? "အခမဲ့ စတင်ရန်" : "Create your account"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => navigate("/login")}>
              {my ? "ဝင်ရောက်ရန်" : "Sign in"}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={20} height={20} />
            <span className="font-display text-sm font-semibold">
              <span className="text-primary">Thwe</span><span className="text-accent">Sat</span>
            </span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-foreground">{my ? "ဝင်ရောက်" : "Sign in"}</Link>
            <Link to="/onboarding" className="hover:text-foreground">{my ? "စတင်" : "Get started"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
