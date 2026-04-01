import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, Briefcase, User, ChevronRight, ChevronLeft, Copy, Check, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const toneOptions = [
  { value: "professional", labelMy: "Professional", labelEn: "Professional" },
  { value: "friendly", labelMy: "ဖော်ရွေသော", labelEn: "Friendly" },
  { value: "confident", labelMy: "ယုံကြည်မှုရှိသော", labelEn: "Confident" },
  { value: "enthusiastic", labelMy: "စိတ်အားထက်သန်သော", labelEn: "Enthusiastic" },
];

const CoverLetterGenerator = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
    yourName: "",
    yourExperience: "",
    tone: "professional",
  });

  const generateLetter = () => {
    const name = form.yourName || "Maung Maung";
    const title = form.jobTitle || "the position";
    const company = form.company || "your company";
    const tone = form.tone;

    const greeting = tone === "friendly" ? "Hello" : "Dear Hiring Manager";
    const opener = tone === "enthusiastic"
      ? `I am thrilled to apply for the ${title} position at ${company}!`
      : tone === "confident"
        ? `I am writing to express my strong interest in the ${title} role at ${company}.`
        : `I am writing to apply for the ${title} position at ${company}.`;

    return `${greeting},

${opener}

${form.yourExperience ? `With my background in ${form.yourExperience.substring(0, 100)}, I am confident that I can make a meaningful contribution to your team.` : `With my professional experience and dedication to excellence, I am confident that I can make a meaningful contribution to your team.`}

${form.jobDescription ? `I was particularly drawn to this role because of ${form.jobDescription.substring(0, 80)}. My skills and experience align well with these requirements.` : "I am excited about the opportunity to bring my skills and passion to this role."}

I am experienced in collaborating with remote teams across different time zones, and I pride myself on clear communication, timely delivery, and producing high-quality work. I am eager to discuss how my background and skills would be a great fit for ${company}.

Thank you for considering my application. I look forward to the opportunity to discuss my qualifications further.

Best regards,
${name}`;
  };

  const handleGenerate = () => {
    if (!form.jobTitle && !form.company) {
      toast({
        title: lang === "my" ? "အချက်အလက် ဖြည့်ပါ" : "Fill in details",
        description: lang === "my" ? "အနည်းဆုံး ရာထူးနှင့် ကုမ္ပဏီနာမည်ကို ဖြည့်ပါ" : "Please fill in at least job title and company name",
      });
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStep(2);
    }, 1800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateLetter());
    setCopied(true);
    toast({
      title: lang === "my" ? "ကူးယူပြီးပါပြီ" : "Copied!",
      description: lang === "my" ? "Cover letter ကို clipboard သို့ ကူးယူပြီးပါပြီ" : "Cover letter copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Cover Letter ဖန်တီးရေး" : "Cover Letter"} backPath="/ai-tools" />
      <div className="px-5 pt-4">
        {/* Progress */}
        <div className="mb-5 flex gap-2">
          {[lang === "my" ? "အချက်အလက်" : "Details", lang === "my" ? "ရလဒ်" : "Result"].map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] font-medium ${i + 1 <= step ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Job Info */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အလုပ်အချက်အလက်" : "Job Details"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "လျှောက်ထားလိုသော အလုပ်" : "The job you're applying for"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရာထူး" : "Job Title"}</label>
                    <input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - React Developer" : "e.g. React Developer"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီ" : "Company Name"}</label>
                    <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - TechCorp" : "e.g. TechCorp"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အလုပ်ဖော်ပြချက်" : "Job Description (optional)"}</label>
                    <textarea value={form.jobDescription} onChange={e => setForm({ ...form, jobDescription: e.target.value })} rows={2} placeholder={lang === "my" ? "အလုပ်၏ အဓိက လိုအပ်ချက်များ..." : "Key requirements from the job posting..."} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Your info */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
                    <User className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "သင့်အကြောင်း" : "About You"}</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "နာမည်" : "Your Name"}</label>
                    <input value={form.yourName} onChange={e => setForm({ ...form, yourName: e.target.value })} placeholder={lang === "my" ? "ဥပမာ - မောင်မောင်" : "e.g. Maung Maung"} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အတွေ့အကြုံ" : "Your Experience"}</label>
                    <textarea value={form.yourExperience} onChange={e => setForm({ ...form, yourExperience: e.target.value })} rows={2} placeholder={lang === "my" ? "သင့်အတွေ့အကြုံကို အကျဉ်းချုပ် ဖော်ပြပါ..." : "Briefly describe your experience..."} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Tone */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "အသံအနေအထား" : "Tone"}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {toneOptions.map(t => (
                    <button key={t.value} onClick={() => setForm({ ...form, tone: t.value })} className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${form.tone === t.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground active:bg-muted"}`}>
                      {lang === "my" ? t.labelMy : t.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? (
                  <span className="flex items-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                    {lang === "my" ? "ဖန်တီးနေသည်..." : "Generating..."}
                  </span>
                ) : (
                  <>{lang === "my" ? "Cover Letter ဖန်တီးရန်" : "Generate Cover Letter"} <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
                      <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "Cover Letter အသင့်ဖြစ်ပါပြီ" : "Cover Letter Ready!"}</h2>
                      <p className="text-[10px] text-muted-foreground">{form.jobTitle} · {form.company}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald">{form.tone}</span>
                </div>

                <div className="rounded-lg bg-background p-3">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{generateLetter()}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? (lang === "my" ? "ကူးပြီး" : "Copied") : (lang === "my" ? "ကူးယူရန်" : "Copy")}
                </Button>
                <Button onClick={() => { setStep(1); setForm({ jobTitle: "", company: "", jobDescription: "", yourName: "", yourExperience: "", tone: "professional" }); }} className="flex-1">
                  <PenLine className="h-4 w-4" />
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

export default CoverLetterGenerator;
