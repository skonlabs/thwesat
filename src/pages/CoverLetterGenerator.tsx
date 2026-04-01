import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, Briefcase, User, ChevronRight, ChevronLeft, Copy, Check, Download, Loader2, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
  const location = useLocation();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { profile, session } = useAuth();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [cvParsed, setCvParsed] = useState(false);

  const [form, setForm] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
    yourName: profile?.display_name || "",
    yourExperience: "",
    tone: "professional",
  });

  // Parse CV if file path was passed from Career Tools
  const cvFilePath = (location.state as any)?.cvFilePath;

  useEffect(() => {
    if (cvFilePath && session?.access_token && !cvParsed) {
      parseCv(cvFilePath);
    }
  }, [cvFilePath, session?.access_token]);

  const parseCv = async (filePath: string) => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-cv", {
        body: { file_path: filePath },
      });
      if (error) throw error;

      const parsed = data?.data;
      if (parsed) {
        setForm(prev => ({
          ...prev,
          yourName: parsed.name || prev.yourName,
          yourExperience: [
            ...(parsed.experiences || []).map((ex: any) =>
              [ex.role, ex.company, ex.duration].filter(Boolean).join(" at ")
              + (ex.description ? ` — ${ex.description}` : "")
            ),
            ...(parsed.skills?.length ? [`Skills: ${parsed.skills.join(", ")}`] : []),
            ...(parsed.summary ? [parsed.summary] : []),
          ].join("\n") || prev.yourExperience,
        }));
        setCvParsed(true);
        toast({
          title: lang === "my" ? "CV မှ အချက်အလက်များ ဖတ်ပြီးပါပြီ ✓" : "CV parsed successfully ✓",
          description: lang === "my" ? "အချက်အလက်များကို စစ်ဆေးပြင်ဆင်ပါ" : "Review and edit the extracted data",
        });
      }
    } catch (err: any) {
      console.error("CV parse error:", err);
      toast({
        title: lang === "my" ? "CV ဖတ်၍ မရပါ" : "Could not parse CV",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.jobTitle && !form.company) {
      toast({
        title: lang === "my" ? "အချက်အလက် ဖြည့်ပါ" : "Fill in details",
        description: lang === "my" ? "အနည်းဆုံး ရာထူးနှင့် ကုမ္ပဏီနာမည်ကို ဖြည့်ပါ" : "Please fill in at least job title and company name",
      });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: form,
      });
      if (error) throw error;
      const letter = data?.data?.letter;
      if (letter) {
        setGeneratedLetter(letter);
        setStep(2);
      } else {
        throw new Error("No data returned");
      }
    } catch (err: any) {
      console.error("Cover letter generation error:", err);
      toast({
        title: lang === "my" ? "ဖန်တီး၍ မရပါ" : "Generation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    toast({
      title: lang === "my" ? "ကူးယူပြီးပါပြီ" : "Copied!",
      description: lang === "my" ? "Cover letter ကို clipboard သို့ ကူးယူပြီးပါပြီ" : "Cover letter copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!generatedLetter) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 25;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(generatedLetter, maxWidth);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    }
    doc.save(`cover-letter-${form.company || "draft"}.pdf`);
    toast({ title: lang === "my" ? "PDF ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ" : "PDF downloaded" });
  };

  const handleDownloadDocx = async () => {
    if (!generatedLetter) return;
    const { Document, Packer, Paragraph, TextRun } = await import("docx");

    const paragraphs = generatedLetter.split("\n").map(
      (line) => new Paragraph({ children: [new TextRun({ text: line, size: 22 })] })
    );

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${form.company || "draft"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: lang === "my" ? "DOCX ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ" : "DOCX downloaded" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Cover Letter ဖန်တီးရေး" : "Cover Letter"} onBack={() => step > 1 ? setStep(s => s - 1) : navigate("/ai-tools")} />
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
              {/* CV Parsing indicator */}
              {parsing && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {lang === "my" ? "CV ဖတ်နေသည်..." : "Parsing your CV with AI..."}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "my" ? "အချက်အလက်များကို ထုတ်ယူနေပါသည်" : "Extracting your experience and skills"}
                    </p>
                  </div>
                </div>
              )}

              {/* Pre-populated notice */}
              {!parsing && cvParsed && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                  <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                  <p className="text-xs text-primary font-medium">
                    {lang === "my" ? "CV မှ အချက်အလက်များ ဖြည့်သွင်းထားပါသည် — စစ်ဆေးပြင်ဆင်ပါ" : "Pre-filled from your CV — review & edit below"}
                  </p>
                </div>
              )}

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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {lang === "my" ? "AI ဖြင့် ဖန်တီးနေသည်..." : "AI is generating..."}
                  </span>
                ) : (
                  <>{lang === "my" ? "Cover Letter ဖန်တီးရန်" : "Generate Cover Letter"} <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </motion.div>
          )}

          {step === 2 && generatedLetter && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
                      <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "AI Cover Letter အသင့်ဖြစ်ပါပြီ" : "AI Cover Letter Ready!"}</h2>
                      <p className="text-[10px] text-muted-foreground">{form.jobTitle} · {form.company}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald">{form.tone}</span>
                </div>

                <div className="rounded-lg bg-background p-3">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{generatedLetter}</p>
                </div>
              </div>

              {/* Download buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadDocx} className="flex-1">
                  <Download className="h-4 w-4" />
                  DOCX
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? (lang === "my" ? "ကူးပြီး" : "Copied") : (lang === "my" ? "ကူးယူရန်" : "Copy")}
                </Button>
                <Button onClick={() => { setStep(1); setGeneratedLetter(null); setForm({ jobTitle: "", company: "", jobDescription: "", yourName: profile?.display_name || "", yourExperience: profile?.experience || "", tone: "professional" }); }} className="flex-1">
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
