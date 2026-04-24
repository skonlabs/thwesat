import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Target, ChevronRight, ChevronLeft, Check, X, BookOpen, ExternalLink, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const targetRoles = [
  { value: "frontend", labelMy: "ဝက်ဘ်ရှေ့ပိုင်း ဒီဗလပ်ပါ", labelEn: "Frontend Developer" },
  { value: "fullstack", labelMy: "အပြည့်အစုံ ဒီဗလပ်ပါ", labelEn: "Full Stack Developer" },
  { value: "mobile", labelMy: "မိုဘိုင်း ဒီဗလပ်ပါ", labelEn: "Mobile Developer" },
  { value: "uiux", labelMy: "UI/UX ဒီဇိုင်နာ", labelEn: "UI/UX Designer" },
  { value: "data", labelMy: "ဒေတာ ခွဲခြမ်းစိတ်ဖြာသူ", labelEn: "Data Analyst" },
  { value: "pm", labelMy: "စီမံကိန်း မန်နေဂျာ", labelEn: "Project Manager" },
];

const allSkills = [
  "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js",
  "Python", "SQL", "Git", "Docker", "AWS", "Figma",
  "HTML/CSS", "REST APIs", "GraphQL", "MongoDB", "PostgreSQL",
  "React Native", "Flutter", "Swift", "Kotlin", "Java",
  "Tailwind CSS", "Next.js", "Express.js", "Firebase",
  "Agile/Scrum", "Jira", "Communication", "Leadership",
];

const roleRequirements: Record<string, { required: string[]; nice: string[]; resources: { skill: string; link: string; source: string }[] }> = {
  frontend: {
    required: ["JavaScript", "TypeScript", "React", "HTML/CSS", "Tailwind CSS", "Git", "REST APIs"],
    nice: ["Next.js", "Vue.js", "GraphQL", "Docker", "Figma", "AWS"],
    resources: [
      { skill: "TypeScript", link: "https://www.typescriptlang.org/docs/", source: "Official Docs" },
      { skill: "React", link: "https://react.dev/learn", source: "React.dev" },
      { skill: "Next.js", link: "https://nextjs.org/learn", source: "Next.js Learn" },
    ],
  },
  fullstack: {
    required: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Git", "REST APIs", "Docker"],
    nice: ["GraphQL", "AWS", "MongoDB", "Next.js", "Express.js", "Firebase"],
    resources: [
      { skill: "Node.js", link: "https://nodejs.org/en/learn", source: "Node.js Docs" },
      { skill: "PostgreSQL", link: "https://www.postgresql.org/docs/", source: "PostgreSQL Docs" },
      { skill: "Docker", link: "https://docs.docker.com/get-started/", source: "Docker Docs" },
    ],
  },
  mobile: {
    required: ["JavaScript", "React Native", "TypeScript", "Git", "REST APIs"],
    nice: ["Flutter", "Swift", "Kotlin", "Firebase", "Figma"],
    resources: [
      { skill: "React Native", link: "https://reactnative.dev/docs/getting-started", source: "RN Docs" },
      { skill: "Flutter", link: "https://flutter.dev/docs", source: "Flutter Docs" },
    ],
  },
  uiux: {
    required: ["Figma", "HTML/CSS", "Communication"],
    nice: ["Tailwind CSS", "React", "JavaScript", "Agile/Scrum"],
    resources: [
      { skill: "Figma", link: "https://help.figma.com/", source: "Figma Learn" },
    ],
  },
  data: {
    required: ["Python", "SQL", "Git"],
    nice: ["PostgreSQL", "MongoDB", "AWS", "JavaScript"],
    resources: [
      { skill: "Python", link: "https://docs.python.org/3/tutorial/", source: "Python Docs" },
      { skill: "SQL", link: "https://www.w3schools.com/sql/", source: "W3Schools" },
    ],
  },
  pm: {
    required: ["Agile/Scrum", "Jira", "Communication", "Leadership"],
    nice: ["Git", "SQL", "Figma", "JavaScript"],
    resources: [
      { skill: "Agile/Scrum", link: "https://www.scrum.org/resources", source: "Scrum.org" },
    ],
  },
};

const STORAGE_KEY = "skill_gap_result";

interface SavedAnalysis {
  role: string;
  score: number;
  missing: string[];
  date: string;
}

function relativeDate(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === "my") {
    if (mins < 1) return "ယခုလေး";
    if (mins < 60) return `${mins} မိနစ် အရင်က`;
    if (hours < 24) return `${hours} နာရီ အရင်က`;
    return `${days} ရက် အရင်က`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const SkillGapAnalysis = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<SavedAnalysis | null>(null);

  // Load saved analysis on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SavedAnalysis = JSON.parse(raw);
        setLastAnalysis(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleAnalyze = () => {
    if (!selectedRole) return;
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setStep(3); }, 2000);
  };

  const getAnalysis = () => {
    const reqs = roleRequirements[selectedRole] || roleRequirements.frontend;
    const haveRequired = reqs.required.filter(s => selectedSkills.includes(s));
    const missingRequired = reqs.required.filter(s => !selectedSkills.includes(s));
    const haveNice = reqs.nice.filter(s => selectedSkills.includes(s));
    const missingNice = reqs.nice.filter(s => !selectedSkills.includes(s));
    const score = Math.round((haveRequired.length / reqs.required.length) * 100);

    // Build resources: start with role-specific links, then add fallbacks for missing skills that have no specific resource
    const specificSkills = new Set(reqs.resources.map(r => r.skill));
    const fallbackResources: { skill: string; link: string; source: string }[] = [];
    for (const skill of missingRequired) {
      if (!specificSkills.has(skill)) {
        fallbackResources.push(
          { skill, link: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill)}`, source: "YouTube" },
          { skill, link: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`, source: "Coursera" },
        );
      }
    }

    return { haveRequired, missingRequired, haveNice, missingNice, score, resources: [...reqs.resources, ...fallbackResources] };
  };

  const handleSaveAnalysis = () => {
    const analysis = getAnalysis();
    const record: SavedAnalysis = {
      role: selectedRole,
      score: analysis.score,
      missing: analysis.missingRequired,
      date: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setLastAnalysis(record);
  };

  const stepDefs = [
    { num: 1, labelMy: "ရာထူး ရွေးချယ်", labelEn: "Choose Role" },
    { num: 2, labelMy: "ကျွမ်းကျင်မှု ရွေးချယ်", labelEn: "Select Skills" },
    { num: 3, labelMy: "ရလဒ် ကြည့်ရှု", labelEn: "View Results" },
  ];

  const lastAnalysisForRole = lastAnalysis?.role === selectedRole ? lastAnalysis : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ" : "Skill Gap Analysis"} onBack={() => step > 1 ? setStep(s => s - 1) : navigate("/ai-tools")} />
      <div className="px-5 pt-4">
        {/* Step indicator */}
        <div className="mb-5 flex items-start justify-between gap-1">
          {stepDefs.map((s, i) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isCompleted ? <Check className="h-3 w-3" strokeWidth={3} /> : s.num}
                  </div>
                  {i < stepDefs.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded-full transition-colors ${step > s.num ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
                <span className={`text-center text-[9px] font-medium leading-tight ${isCurrent ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"}`}>
                  {lang === "my" ? s.labelMy : s.labelEn}
                </span>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select target role */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပန်းတိုင် ရာထူး ရွေးချယ်ပါ" : "Select Target Role"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "သင် ဖြစ်ချင်သော ရာထူးကို ရွေးပါ" : "Choose the role you want to pursue"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {targetRoles.map(role => (
                    <button key={role.value} onClick={() => setSelectedRole(role.value)} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${selectedRole === role.value ? "border-primary bg-primary/5" : "border-border active:bg-muted"}`}>
                      <span className={`text-sm font-medium ${selectedRole === role.value ? "text-primary" : "text-foreground"}`}>{lang === "my" ? role.labelMy : role.labelEn}</span>
                      {selectedRole === role.value && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
                    </button>
                  ))}
                </div>
                {/* Last analyzed for this role */}
                {lastAnalysis && selectedRole && lastAnalysis.role === selectedRole && (
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {lang === "my"
                      ? `နောက်ဆုံး ခွဲခြမ်းစိတ်ဖြာ: ${relativeDate(lastAnalysis.date, lang)}`
                      : `Last analyzed: ${relativeDate(lastAnalysis.date, lang)}`}
                  </p>
                )}
              </div>
              <Button onClick={() => { if (!selectedRole) return; setStep(2); }} className="w-full">
                {lang === "my" ? "ရှေ့ဆက်ရန်" : "Continue"} <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Select your current skills */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
                    <TrendingUp className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "သင့်ကျွမ်းကျင်မှုများ ရွေးပါ" : "Select Your Skills"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "လက်ရှိ ကျွမ်းကျင်သော အရာများကို ရွေးချယ်ပါ" : "Pick the skills you currently have"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map(skill => (
                    <button key={skill} onClick={() => toggleSkill(skill)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selectedSkills.includes(skill) ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground active:bg-muted"}`}>
                      {skill}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {selectedSkills.length} {lang === "my" ? "ခု ရွေးချယ်ထားပါသည်" : "selected"}
                  </p>
                  {selectedSkills.length > 0 && (
                    <button
                      onClick={() => setSelectedSkills([])}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-destructive active:bg-destructive/10"
                    >
                      {lang === "my" ? "အားလုံး ဖယ်ရှားရန်" : "Clear all"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Back"}
                </Button>
                <Button onClick={handleAnalyze} disabled={analyzing} className="flex-1">
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                      {lang === "my" ? "ခွဲခြမ်းစိတ်ဖြာနေသည်..." : "Analyzing..."}
                    </span>
                  ) : (
                    <>{lang === "my" ? "ခွဲခြမ်းစိတ်ဖြာရန်" : "Analyze"} <ChevronRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (() => {
            const analysis = getAnalysis();
            const roleName = targetRoles.find(r => r.value === selectedRole);
            return (
              <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Score */}
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{lang === "my" ? "ပြည့်စုံမှု ရမှတ်" : "Readiness Score"}</p>
                  <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center">
                    <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <motion.circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${analysis.score * 2.64} 264`} initial={{ strokeDasharray: "0 264" }} animate={{ strokeDasharray: `${analysis.score * 2.64} 264` }} transition={{ duration: 1, delay: 0.3 }} />
                    </svg>
                    <span className="absolute text-2xl font-bold text-foreground">{analysis.score}%</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{lang === "my" ? roleName?.labelMy : roleName?.labelEn}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analysis.score >= 80
                      ? (lang === "my" ? "အလွန်ကောင်းပါသည်! လျှောက်ထားရန် အသင့်ဖြစ်ပါပြီ" : "Excellent! You're ready to apply")
                      : analysis.score >= 50
                        ? (lang === "my" ? "ကောင်းပါသည်! နောက်ထပ် ကျွမ်းကျင်မှု အနည်းငယ် လိုအပ်ပါသည်" : "Good! A few more skills needed")
                        : (lang === "my" ? "စတင်ရန် ကောင်းပါသည်! လေ့လာရန် အချိန်ယူပါ" : "Good start! Take time to learn more")}
                  </p>
                  {/* Last analyzed label */}
                  {lastAnalysisForRole && (
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {lang === "my"
                        ? `နောက်ဆုံး ခွဲခြမ်းစိတ်ဖြာ: ${relativeDate(lastAnalysisForRole.date, lang)}`
                        : `Last analyzed: ${relativeDate(lastAnalysisForRole.date, lang)}`}
                    </p>
                  )}
                </div>

                {/* Required skills */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "မဖြစ်မနေ လိုအပ်သော ကျွမ်းကျင်မှုများ" : "Required Skills"}</h3>
                  <div className="space-y-2">
                    {analysis.haveRequired.map(s => (
                      <div key={s} className="flex items-center gap-2 rounded-lg bg-emerald/5 px-3 py-2">
                        <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                        <span className="text-xs font-medium text-foreground">{s}</span>
                      </div>
                    ))}
                    {analysis.missingRequired.map(s => (
                      <div key={s} className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2">
                        <X className="h-4 w-4 text-destructive" strokeWidth={2} />
                        <span className="text-xs font-medium text-foreground">{s}</span>
                        <span className="ml-auto rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">{lang === "my" ? "လိုအပ်" : "Missing"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nice to have */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ရှိလျှင် ပိုကောင်းသော ကျွမ်းကျင်မှုများ" : "Nice to Have"}</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.haveNice.map(s => (
                      <span key={s} className="rounded-md bg-emerald/10 px-2.5 py-1 text-[11px] font-medium text-emerald">{s} ✓</span>
                    ))}
                    {analysis.missingNice.map(s => (
                      <span key={s} className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Learning Resources */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "လေ့လာရန် အရင်းအမြစ်များ" : "Learning Resources"}</h3>
                  </div>
                  <div className="space-y-2">
                    {analysis.resources.map((r, i) => (
                      <a key={i} href={r.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors active:bg-muted">
                        <div>
                          <p className="text-xs font-medium text-foreground">{r.skill}</p>
                          <p className="text-[10px] text-muted-foreground">{r.source}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setStep(1); setSelectedSkills([]); setSelectedRole(""); }} className="flex-1">
                    <TrendingUp className="h-4 w-4" />
                    {lang === "my" ? "ထပ်မံ ခွဲခြမ်းစိတ်ဖြာရန်" : "Analyze Again"}
                  </Button>
                  <Button variant="outline" onClick={handleSaveAnalysis} className="flex-1">
                    <Save className="h-4 w-4" />
                    {lang === "my" ? "သိမ်းဆည်းရန်" : "Save analysis"}
                  </Button>
                </div>
                <Button onClick={() => navigate("/ai-tools")} className="w-full">
                  <ChevronLeft className="h-4 w-4" />
                  {lang === "my" ? "အသက်မွေးမှု Tools" : "Career Tools"}
                </Button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SkillGapAnalysis;
