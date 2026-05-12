import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Briefcase, Building2, Shield, Users, GraduationCap, Wallet, ArrowRight, CheckCircle2, Code2, LineChart, HeartPulse, Hammer, Utensils, Palette } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    if (location.trim()) params.set("location", location.trim());
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
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={my ? "မြို့ သို့မဟုတ် နိုင်ငံ" : "City or country"}
                className="h-10 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
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
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{my ? "အသစ်ထွက် အလုပ်များ" : "Featured jobs"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{my ? "ယနေ့ စတင်လျှောက်ထားနိုင်သော အလုပ်များ" : "Hand-picked opportunities you can apply to today"}</p>
            </div>
            <button onClick={() => navigate("/jobs")} className="text-sm font-semibold text-accent hover:underline">
              {my ? "အားလုံး" : "See all"} →
            </button>
          </div>

          {featuredJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {my ? "အလုပ်ခေါ်စာများ မကြာမီ ထည့်သွင်းပေးပါမည်။" : "New jobs are being added — check back soon."}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {featuredJobs.map((job: any) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15">
                    <Building2 className="h-6 w-6 text-gold-dark" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-foreground group-hover:text-primary">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                      {job.is_diaspora_safe && (
                        <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">
                          <Shield className="mr-0.5 inline h-2.5 w-2.5" strokeWidth={2} />{my ? "လုံခြုံ" : "Safe"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} /> {translateJobLocation(job.location, lang)}
                      </span>
                      <span className="font-semibold text-gold-dark">{formatJobSalary(job, lang)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust / value props */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{my ? "အဘယ်ကြောင့် ThweSat" : "Why ThweSat"}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {my ? "သင့်အလုပ်ရှာဖွေမှု ပိုလွယ်ကူ၊ ပိုလုံခြုံ" : "A safer, smarter way to find work"}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.en} className="rounded-xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{my ? t.my : t.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column CTAs: Seekers vs Employers */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2 md:px-8 md:py-16">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-gold-dark">
              <Briefcase className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{my ? "အလုပ်ရှာဖွေသူများအတွက်" : "For job seekers"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {my ? "အခမဲ့ ပရိုဖိုင်တည်ဆောက်ပြီး လုံခြုံစိတ်ချရသော အလုပ်များကို ရှာဖွေပါ။" : "Build a free profile, apply to verified jobs, and get guidance from mentors who've been there."}
            </p>
            <Button className="mt-5" onClick={() => navigate("/onboarding")}>
              {my ? "အခမဲ့ စတင်ရန်" : "Create free account"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-primary p-8 text-primary-foreground">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{my ? "အလုပ်ရှင်များအတွက်" : "For employers"}</h3>
            <p className="mt-2 text-sm text-primary-foreground/75">
              {my ? "ခေါ်ယူမှုတင်ပြီး အရည်အချင်းပြည့်စုံသူများကို ရှာဖွေပါ။" : "Post a role, search vetted talent, and hire confidently across APAC."}
            </p>
            <Button variant="secondary" className="mt-5" onClick={() => navigate("/employer/onboarding")}>
              {my ? "အလုပ်ခေါ်ရန်" : "Post a job"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
