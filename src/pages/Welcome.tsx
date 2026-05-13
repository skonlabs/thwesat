import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Briefcase, Building2, Shield, Users, GraduationCap, Wallet, ArrowRight, CheckCircle2, Code2, LineChart, HeartPulse, Hammer, Utensils, Palette } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CityAutocomplete from "@/components/CityAutocomplete";
import logo from "@/assets/logo.svg";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/LanguageToggle";
import { useJobs } from "@/hooks/use-jobs";
import { useMentorProfiles } from "@/hooks/use-mentor-data";
import { useAllProfiles } from "@/hooks/use-profiles";
import { formatJobSalary, translateJobLocation, translateJobTitle } from "@/lib/job-localization";

const Welcome = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const my = lang === "my";
  const { data: jobs } = useJobs();
  const { data: mentors } = useMentorProfiles();
  const { data: allProfiles } = useAllProfiles();

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.trim()) {
      // City autocomplete returns "City, Country" — match on the city portion
      // so it lines up with how jobs typically store the location field.
      const loc = location.split(",")[0].trim();
      if (loc) params.set("loc", loc);
    }
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const featured = (jobs || []).filter((j: any) => j.is_featured).slice(0, 6);
  const featuredJobs = featured.length > 0 ? featured : (jobs || []).slice(0, 6);

  const categories = [
    { icon: Code2, en: "Tech & IT", my: "နည်းပညာ", q: "developer" },
    { icon: LineChart, en: "Business", my: "စီးပွားရေး", q: "business" },
    { icon: HeartPulse, en: "Healthcare", my: "ကျန်းမာရေး", q: "nurse" },
    { icon: Hammer, en: "Construction", my: "ဆောက်လုပ်ရေး", q: "construction" },
    { icon: Utensils, en: "Hospitality", my: "ဧည့်ဝန်ဆောင်မှု", q: "hospitality" },
    { icon: Palette, en: "Design", my: "ဒီဇိုင်း", q: "designer" },
    { icon: Briefcase, en: "Sales", my: "အရောင်း", q: "sales" },
    { icon: GraduationCap, en: "Education", my: "ပညာရေး", q: "teacher" },
  ];

  const trust = [
    { icon: Shield, en: "Verified employers only", my: "အတည်ပြုထားသော အလုပ်ရှင်များသာ" },
    { icon: CheckCircle2, en: "Scam-checked listings", my: "လိမ်လည်မှု စစ်ဆေးပြီး အလုပ်များ" },
    { icon: Users, en: "Mentors who've been there", my: "အတွေ့အကြုံရှိ လမ်းညွှန်သူများ" },
    { icon: Wallet, en: "Transparent salary ranges", my: "ပွင့်လင်းသော လစာ" },
  ];

  return (
    <div className="landing-dark min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-shell bg-shell text-shell-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8 md:py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ThweSat" width={32} height={32} />
            <span className="font-brand text-lg font-semibold">
              <span className="text-shell-foreground">Thwe</span><span className="text-accent">Sat</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-shell-foreground/70 md:flex">
            <button onClick={() => navigate("/jobs")} className="hover:text-shell-foreground">{my ? "အလုပ်များ" : "Find Jobs"}</button>
            <button onClick={() => navigate("/mentors")} className="hover:text-shell-foreground">{my ? "လမ်းညွှန်သူများ" : "Mentors"}</button>
            <button onClick={() => navigate("/guides")} className="hover:text-shell-foreground">{my ? "လမ်းညွှန်" : "Guides"}</button>
            <button onClick={() => navigate("/employer/onboarding")} className="hover:text-shell-foreground">{my ? "အလုပ်ရှင်များအတွက်" : "For Employers"}</button>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => navigate("/login")}>
              {my ? "ဝင်ရောက်ရန်" : "Sign in"}
            </Button>
            <Button size="sm" onClick={() => navigate("/onboarding")}>
              {my ? "စတင်ရန်" : "Get started"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero with search */}
      <section className="relative overflow-hidden border-b border-shell bg-shell text-shell-foreground">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-sidebar-accent/70 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {my ? "မြန်မာပရော်ဖက်ရှင်နယ်များအတွက်" : "Built for Myanmar professionals — at home & across APAC"}
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-shell-foreground md:text-6xl">
              {my ? "သင့်အတွက် သင့်တော်တဲ့" : "Find the job that"}
              <br />
              <span className="text-accent">{my ? "အလုပ်ကို ရှာပါ။" : "fits your life."}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-shell-foreground/75 md:text-lg">
              {my
                ? "လုံခြုံစိတ်ချရသော အလုပ်ခေါ်စာများ၊ လမ်းညွှန်မှုနှင့် အသက်မွေးဝမ်းကျောင်း ကိရိယာများ — တစ်နေရာတည်းမှာ။"
                : "Thousands of verified jobs, real mentors, and the career tools you need — all in one place."}
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-card-hover md:flex-row md:items-center md:gap-0 md:rounded-full md:p-1.5"
          >
            <div className="flex flex-1 items-center gap-2 px-3 md:px-4">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={2} />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={my ? "ရာထူး၊ ကုမ္ပဏီ၊ ကျွမ်းကျင်မှု" : "Job title, company, or skill"}
                className="h-10 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="flex flex-1 items-center gap-2 px-3 md:px-4">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={2} />
              <CityAutocomplete
                value={location}
                onChange={setLocation}
                placeholder={my ? "မြို့ သို့မဟုတ် နိုင်ငံ" : "City or country"}
                emptyText={my ? "မတွေ့ပါ — Enter နှိပ်၍ ရှာနိုင်သည်" : "No matching city. Press Enter to search."}
                hideIcon
              />
            </div>
            <Button type="submit" size="lg" className="h-11 rounded-xl bg-accent px-6 text-accent-foreground hover:bg-accent/90 md:rounded-full">
              {my ? "ရှာဖွေ" : "Search"}
            </Button>
          </motion.form>

          {/* Dual CTA */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-full bg-accent px-7 text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/onboarding")}>
              {my ? "အခမဲ့ စတင်ရန်" : "Create free account"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" className="h-12 rounded-full border border-shell-foreground/20 px-7 text-shell-foreground hover:bg-shell-foreground/10 hover:text-shell-foreground" onClick={() => navigate("/employer/onboarding")}>
              {my ? "အလုပ်ခေါ်ရန်" : "I'm hiring"}
            </Button>
          </div>

          {/* Quick stats */}
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-shell-foreground/10 pt-6 text-xs text-shell-foreground/65">
            <span><span className="font-bold text-shell-foreground">{(jobs || []).length.toLocaleString()}+</span> {my ? "အလုပ်များ" : "open jobs"}</span>
            <span><span className="font-bold text-shell-foreground">{(allProfiles || []).length.toLocaleString()}+</span> {my ? "အဖွဲ့ဝင်များ" : "members"}</span>
            <span><span className="font-bold text-shell-foreground">{(mentors || []).length.toLocaleString()}+</span> {my ? "လမ်းညွှန်သူများ" : "mentors"}</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{my ? "လုပ်ငန်းခွင် အမျိုးအစားများ" : "Browse by category"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{my ? "သင်စိတ်ဝင်စားရာ ကဏ္ဍကို ရွေးချယ်ပါ" : "Pick a field that suits you"}</p>
            </div>
            <button onClick={() => navigate("/jobs")} className="hidden text-sm font-semibold text-accent hover:underline md:inline-flex">
              {my ? "အားလုံးကြည့်ရန်" : "View all jobs"} →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((c) => (
              <button
                key={c.en}
                onClick={() => navigate(`/jobs?q=${encodeURIComponent(c.q)}`)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-gold-dark transition-colors group-hover:bg-accent/25">
                  <c.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="text-sm font-medium text-foreground">{my ? c.my : c.en}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="relative border-b border-border bg-gradient-to-b from-secondary/40 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{my ? "ယနေ့ ထူးချွန်" : "Today's picks"}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{my ? "အသစ်ထွက် အလုပ်များ" : "Featured jobs"}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{my ? "ယနေ့ စတင်လျှောက်ထားနိုင်သော အလုပ်များ" : "Hand-picked opportunities you can apply to today."}</p>
            </div>
            <button onClick={() => navigate("/jobs")} className="hidden items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent md:inline-flex">
              {my ? "အားလုံးကြည့်ရန်" : "See all jobs"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {featuredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              {my ? "အလုပ်ခေါ်စာများ မကြာမီ ထည့်သွင်းပေးပါမည်။" : "New jobs are being added — check back soon."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {featuredJobs.map((job: any, i: number) => (
                <motion.button
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-card transition-all hover:-translate-y-1 hover:border-accent/60 hover:shadow-card-hover"
                >
                  {/* Decorative accent corner */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl transition-opacity group-hover:bg-accent/20" />

                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/20">
                      <Building2 className="h-6 w-6 text-gold-dark" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-lg">
                          {translateJobTitle(job.title, job.title_my, lang)}
                        </h3>
                        {job.is_diaspora_safe && (
                          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald">
                            <Shield className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {my ? "လုံခြုံ" : "Safe"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">{job.company}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{translateJobLocation(job.location, lang)}</span>
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-gold-dark">
                          {formatJobSalary(job, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center md:hidden">
            <Button variant="outline" onClick={() => navigate("/jobs")} className="rounded-full">
              {my ? "အားလုံးကြည့်ရန်" : "See all jobs"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust / value props */}
      <section className="relative overflow-hidden border-b border-shell bg-shell text-shell-foreground">
        <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-sidebar-accent/40 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{my ? "အဘယ်ကြောင့် ThweSat" : "Why ThweSat"}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              {my ? "သင့်အလုပ်ရှာဖွေမှု " : "A safer, smarter way "}
              <span className="text-accent">{my ? "ပိုလွယ်ကူ၊ ပိုလုံခြုံ" : "to find work."}</span>
            </h2>
            <p className="mt-4 max-w-lg text-base text-shell-foreground/70">
              {my
                ? "မြန်မာပရော်ဖက်ရှင်နယ်များအတွက် တည်ဆောက်ထားသော ယုံကြည်စိတ်ချရသော အလုပ်ရှာဖွေရေးပလက်ဖောင်း။"
                : "Built end-to-end for Myanmar professionals, with real verification and human guidance at every step."}
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-shell-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t, i) => (
              <motion.div
                key={t.en}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-shell p-6 transition-colors hover:bg-shell-foreground/[0.04] md:p-7"
              >
                <span className="absolute right-5 top-5 font-display text-sm font-semibold tabular-nums text-shell-foreground/30">
                  0{i + 1}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25 transition-transform group-hover:scale-105">
                  <t.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <p className="mt-5 font-display text-base font-semibold leading-snug tracking-tight text-shell-foreground md:text-lg">
                  {my ? t.my : t.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column CTAs: Seekers vs Employers */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{my ? "စတင်ရန်" : "Get started"}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {my ? "သင့်အတွက် နေရာ ရှိပါသည်" : "There's a place for you here"}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Seekers card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-8 shadow-card md:p-10"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-gold-dark ring-1 ring-accent/30">
                  <Briefcase className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                  {my ? "အလုပ်ရှာဖွေသူများအတွက်" : "For job seekers"}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  {my
                    ? "အခမဲ့ ပရိုဖိုင်တည်ဆောက်ပြီး လုံခြုံစိတ်ချရသော အလုပ်များကို ရှာဖွေပါ။"
                    : "Build a free profile, apply to verified jobs, and get guidance from mentors who've been there."}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {[
                    { en: "Free forever profile", my: "အခမဲ့ ပရိုဖိုင်" },
                    { en: "Verified, scam-free jobs", my: "အတည်ပြုထား၊ လိမ်လည်မှု မရှိ" },
                    { en: "Mentor support in your language", my: "သင့်ဘာသာစကားဖြင့် လမ်းညွှန်" },
                  ].map((b) => (
                    <li key={b.en} className="flex items-start gap-2.5 text-foreground/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={2} />
                      <span>{my ? b.my : b.en}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-8 rounded-full" onClick={() => navigate("/onboarding")}>
                  {my ? "အခမဲ့ စတင်ရန်" : "Create free account"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Employers card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-shell bg-gradient-to-br from-primary via-primary to-shell p-8 text-primary-foreground shadow-navy md:p-10"
            >
              <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-sidebar-accent/40 blur-3xl" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-gold">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                  {my ? "အလုပ်ရှင်များအတွက်" : "For employers"}
                </h3>
                <p className="mt-3 text-sm text-primary-foreground/75 md:text-base">
                  {my
                    ? "ခေါ်ယူမှုတင်ပြီး အရည်အချင်းပြည့်စုံသူများကို APAC တစ်ဝှမ်းမှ ရှာဖွေပါ။"
                    : "Post a role, search vetted talent, and hire confidently across APAC."}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {[
                    { en: "Reach pre-screened candidates", my: "စစ်ဆေးပြီး ကိုယ်စားလှယ်များ" },
                    { en: "Pay only when you hire", my: "ငှားရမ်းမှသာ ပေးချေ" },
                    { en: "Bilingual job posts", my: "နှစ်ဘာသာ ကြော်ငြာ" },
                  ].map((b) => (
                    <li key={b.en} className="flex items-start gap-2.5 text-primary-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2} />
                      <span>{my ? b.my : b.en}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="gold" size="lg" className="mt-8 rounded-full" onClick={() => navigate("/employer/onboarding")}>
                  {my ? "အလုပ်ခေါ်ရန်" : "Post a job"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={20} height={20} />
            <span className="font-brand text-sm font-semibold">
              <span className="text-foreground">Thwe</span><span className="text-accent">Sat</span>
            </span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/jobs" className="hover:text-foreground">{my ? "အလုပ်များ" : "Jobs"}</Link>
            <Link to="/mentors" className="hover:text-foreground">{my ? "လမ်းညွှန်" : "Mentors"}</Link>
            <Link to="/guides" className="hover:text-foreground">{my ? "လမ်းညွှန်ချက်" : "Guides"}</Link>
            <Link to="/privacy-policy" className="hover:text-foreground">{my ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy"}</Link>
            <Link to="/terms-of-service" className="hover:text-foreground">{my ? "စည်းမျဉ်း" : "Terms"}</Link>
            <Link to="/contact" className="hover:text-foreground">{my ? "ဆက်သွယ်ရန်" : "Contact"}</Link>
            <Link to="/login" className="hover:text-foreground">{my ? "ဝင်ရောက်" : "Sign in"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
