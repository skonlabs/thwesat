import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, User, Briefcase, GraduationCap, Award, ChevronRight, ChevronLeft, Copy, Check, Download, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const ProfileBuilder = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    title: "",
    experience: "",
    education: "",
    skills: "",
    platform: "Upwork",
  });

  const platforms = ["Upwork", "Fiverr", "LinkedIn", "Toptal"];

  const generatedProfile = {
    headline: form.title || "Full Stack Developer",
    summary: `Results-driven ${form.title || "professional"} with a proven track record of delivering high-quality solutions. ${form.experience ? `Experienced in ${form.experience.substring(0, 80)}...` : "Passionate about building scalable applications and collaborating with global teams."} Skilled in ${form.skills || "modern technologies"} with a strong foundation in ${form.education || "computer science"}. Committed to continuous learning and delivering exceptional value to clients worldwide.`,
    skills: (form.skills || "React, JavaScript, TypeScript, Node.js, CSS").split(",").map(s => s.trim()).filter(Boolean),
    sections: [
      { title: "Professional Summary", content: `Dedicated ${form.title || "developer"} seeking remote opportunities to leverage expertise in ${form.skills || "modern web technologies"}. Known for clear communication, meeting deadlines, and producing clean, maintainable code.` },
      { title: "Key Achievements", content: "• Delivered 15+ projects on time and within budget\n• Maintained 98% client satisfaction rating\n• Reduced application load times by 40% through optimization\n• Collaborated with cross-functional teams across 5+ time zones" },
    ],
  };

  const handleGenerate = () => {
    if (!form.name && !form.title) {
      toast({
        title: lang === "my" ? "အချက်အလက် ဖြည့်ပါ" : "Fill in details",
        description: lang === "my" ? "အနည်းဆုံး နာမည်နှင့် ရာထူးကို ဖြည့်ပါ" : "Please fill in at least your name and title",
      });
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStep(3);
    }, 2000);
  };

  const handleCopy = () => {
    const text = `${generatedProfile.headline}\n\n${generatedProfile.summary}\n\n${generatedProfile.sections.map(s => `${s.title}\n${s.content}`).join("\n\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: lang === "my" ? "ကူးယူပြီးပါပြီ" : "Copied!",
      description: lang === "my" ? "ပရိုဖိုင်ကို clipboard သို့ ကူးယူပြီးပါပြီ" : "Profile copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const stepLabels = [
    lang === "my" ? "အချက်အလက်" : "Details",
    lang === "my" ? "Platform" : "Platform",
    lang === "my" ? "ရလဒ်" : "Result",
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင် တည်ဆောက်ရန်" : "Profile Builder"} />
      <div className="px-5 pt-4">
        {/* Progress */}
        <div className="mb-5 flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] font-medium ${i + 1 <= step ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Input details */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Personal Info"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "မြန်မာ သို့မဟုတ် အင်္ဂလိပ်ဘာသာဖြင့် ဖြည့်ပါ" : "Fill in Myanmar or English"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "နာမည်" : "Full Name"}</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - မောင်မောင်" : "e.g. Maung Maung"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရာထူး / အထူးပြု" : "Job Title / Specialty"}</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - Web Developer" : "e.g. Web Developer"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
                    <Briefcase className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အတွေ့အကြုံ" : "Experience"}</h2>
                </div>
                <textarea value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} rows={3} placeholder={lang === "my" ? "သင့်အလုပ်အတွေ့အကြုံကို ဖော်ပြပါ..." : "Describe your work experience..."} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <GraduationCap className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပညာရေး" : "Education"}</h2>
                </div>
                <input value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - ကွန်ပျူတာသိပ္ပံ ဘွဲ့" : "e.g. BSc Computer Science"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Award className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
                </div>
                <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - React, Node.js, Figma" : "e.g. React, Node.js, Figma"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                <p className="mt-1 text-[10px] text-muted-foreground">{lang === "my" ? "ကော်မာ (,) ဖြင့် ခွဲပါ" : "Separate with commas"}</p>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                {lang === "my" ? "ရှေ့ဆက်ရန်" : "Continue"} <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Choose platform */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-1 text-sm font-semibold text-foreground">{lang === "my" ? "Platform ရွေးချယ်ပါ" : "Choose Platform"}</h2>
                <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ပရိုဖိုင်ကို မည်သည့် platform အတွက် ပြင်ဆင်ချင်ပါသလဲ?" : "Which platform is this profile for?"}</p>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map(p => (
                    <button key={p} onClick={() => setForm({ ...form, platform: p })} className={`flex items-center gap-2 rounded-xl border p-3.5 text-left transition-colors ${form.platform === p ? "border-primary bg-primary/5" : "border-border bg-background active:bg-muted"}`}>
                      <Globe className={`h-4 w-4 ${form.platform === p ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                      <span className={`text-sm font-medium ${form.platform === p ? "text-primary" : "text-foreground"}`}>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အကြံပြုချက်" : "Tips"}</h3>
                <ul className="space-y-2">
                  {[
                    lang === "my" ? "Professional ဓာတ်ပုံ ထည့်ပါ" : "Add a professional photo",
                    lang === "my" ? "ကျွမ်းကျင်မှု စစ်ဆေးမှုများ ပြုလုပ်ပါ" : "Complete skill tests on the platform",
                    lang === "my" ? "Portfolio link ထည့်ပါ" : "Include your portfolio link",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald" strokeWidth={2} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Back"}
                </Button>
                <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                      {lang === "my" ? "ဖန်တီးနေသည်..." : "Generating..."}
                    </span>
                  ) : (
                    <>{lang === "my" ? "ပရိုဖိုင် ဖန်တီးရန်" : "Generate Profile"}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generated result */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
                      <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် အသင့်ဖြစ်ပါပြီ" : "Profile Ready!"}</h2>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? `${form.platform} အတွက် ပြင်ဆင်ထားပါသည်` : `Optimized for ${form.platform}`}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">{form.platform}</span>
                </div>

                {/* Generated headline */}
                <div className="mb-3 rounded-lg bg-primary/5 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Headline</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{form.name ? `${form.name} — ` : ""}{generatedProfile.headline}</p>
                </div>

                {/* Summary */}
                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Summary</p>
                  <p className="text-xs leading-relaxed text-foreground/80">{generatedProfile.summary}</p>
                </div>

                {/* Sections */}
                {generatedProfile.sections.map((section, i) => (
                  <div key={i} className="mb-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{section.title}</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{section.content}</p>
                  </div>
                ))}

                {/* Skills */}
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedProfile.skills.map((skill, i) => (
                      <span key={i} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? (lang === "my" ? "ကူးပြီး" : "Copied") : (lang === "my" ? "ကူးယူရန်" : "Copy")}
                </Button>
                <Button onClick={() => { setStep(1); setForm({ name: "", title: "", experience: "", education: "", skills: "", platform: "Upwork" }); }} className="flex-1">
                  <FileText className="h-4 w-4" />
                  {lang === "my" ? "အသစ်ဖန်တီးရန်" : "Create New"}
                </Button>
              </div>

              <Button variant="outline" onClick={() => navigate("/ai-tools")} className="w-full">
                <ChevronLeft className="h-4 w-4" />
                {lang === "my" ? "Career Tools သို့ ပြန်သွားရန်" : "Back to Career Tools"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileBuilder;
