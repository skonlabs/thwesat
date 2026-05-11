import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileText, PenLine, TrendingUp, ChevronRight, Upload, Globe, X, File, Check, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const AiProfileBuilder = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isEmployer = profile?.primary_role === "employer" || profile?.primary_role === "agent";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url?: string; filePath?: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem("cv-uploaded-file");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (uploadedFile) {
      sessionStorage.setItem("cv-uploaded-file", JSON.stringify(uploadedFile));
    } else {
      sessionStorage.removeItem("cv-uploaded-file");
    }
  }, [uploadedFile]);

  // Clear CV from sessionStorage on signout for security
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("cv-uploaded-file");
        setUploadedFile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleToolClick = (path: string) => {
    // Pass uploaded CV file path to tools so they can parse it
    navigate(path, { state: { cvFilePath: uploadedFile?.filePath } });
  };

  const processFile = useCallback(async (file: File) => {
    const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    const isDocx = file.type.includes("word") || file.name.toLowerCase().endsWith(".docx");
    if (!isPdf && !isDocx) {
      toast({ title: lang === "my" ? "PDF သို့မဟုတ် DOCX ဖိုင်သာ ခွင့်ပြုပါသည်" : "Only PDF or DOCX files are accepted", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: lang === "my" ? "CV ဖိုင်သည် 10MB ထက် မကျော်ရပါ" : "CV must be under 10MB", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: lang === "my" ? "ကျေးဇူးပြု၍ အရင်ဝင်ပါ" : "Please sign in first", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage.from("cv-documents").upload(filePath, file, { upsert: true });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("cv-documents").getPublicUrl(filePath);

      // Save to cv_documents table
      await supabase.from("cv_documents").insert({
        user_id: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl || filePath,
        file_type: "cv",
        file_size_bytes: file.size,
        is_primary: true,
      });

      // Mark this as a fresh upload — clear the "last parsed" marker so
      // ProfileBuilder will re-parse and rebuild from the new CV.
      sessionStorage.removeItem("cv-last-parsed-path");
      setUploadedFile({ name: file.name, size: file.size, url: urlData.publicUrl, filePath });

      // Await parse so parsed_text/parsed_data land on the cv_documents row
      // before the user navigates away.
      try {
        const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-cv", {
          body: { file_path: filePath },
        });
        if (parseError) {
          console.error("parse-cv failed:", parseError);
          toast({
            title: lang === "my" ? "CV ပြန်ဆန်းစစ်ရန် မအောင်မြင်ပါ" : "CV parsing failed",
            description: parseError.message || String(parseError),
            variant: "destructive",
          });
        } else if ((parseData as any)?.error) {
          console.error("parse-cv server error:", parseData);
          toast({
            title: lang === "my" ? "CV ပြန်ဆန်းစစ်ရန် မအောင်မြင်ပါ" : "CV parsing failed",
            description: (parseData as any).error,
            variant: "destructive",
          });
        }
      } catch (e: any) {
        console.error("parse-cv threw:", e);
        toast({
          title: lang === "my" ? "CV ပြန်ဆန်းစစ်ရန် မအောင်မြင်ပါ" : "CV parsing failed",
          description: e?.message || String(e),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: lang === "my" ? "တင်၍ မရပါ" : "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [user, lang, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = async () => {
    setUploadedFile(null);
  };

  const aiFeatures = [
    {
      icon: FileText,
      title: lang === "my" ? "ပရိုဖိုင် တည်ဆောက်ရန်" : "Profile Builder",
      desc: lang === "my" ? "သင့်မြန်မာဘာသာ CV ကို နိုင်ငံတကာ အဆင့်မီ English Profile အဖြစ် ပြောင်းလဲပေးပါမည်" : "Transform your Myanmar CV into a globally competitive English profile",
      status: lang === "my" ? "အသင့်" : "Ready",
      rawStatus: "Ready",
      path: "/ai-tools/profile-builder",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-emerald/10",
      statusColor: "text-emerald",
    },
    {
      icon: PenLine,
      title: lang === "my" ? "အလုပ်လျှောက်လွှာ ဖန်တီးရန်" : "Cover Letter Generator",
      desc: lang === "my" ? "အလုပ်တစ်ခုချင်းစီအတွက် စိတ်ကြိုက် အလုပ်လျှောက်လွှာ ရေးသားပေးပါမည်" : "Generate tailored cover letters for each job application",
      status: lang === "my" ? "ကြိုစမ်းကြည့်ရင်း" : "Beta",
      rawStatus: "Beta",
      path: "/ai-tools/cover-letter",
      iconBg: "bg-emerald/10",
      iconColor: "text-emerald",
      statusBg: "bg-amber-500/10",
      statusColor: "text-amber-600",
    },
    {
      icon: TrendingUp,
      title: lang === "my" ? "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ" : "Skill Gap Analysis",
      desc: lang === "my" ? "သင်လိုချင်သော အလုပ်အတွက် မည်သည့် ကျွမ်းကျင်မှုများ လိုအပ်သေးသည်ကို ခွဲခြမ်းစိတ်ဖြာပေးပါမည်" : "Identify skill gaps between your profile and target roles",
      status: lang === "my" ? "ကြိုစမ်းကြည့်ရင်း" : "Beta",
      rawStatus: "Beta",
      path: "/ai-tools/skill-gap",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-amber-500/10",
      statusColor: "text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Tools"} showBack />
      <div className="px-5 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {isEmployer ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === "my" ? "အလုပ်ရှင်အတွက် ကိရိယာများ" : "Employer tools"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">{lang === "my" ? "အလုပ်ရှင်များအတွက် ဤကိရိယာများ မလိုအပ်ပါ" : "These tools are designed for job seekers"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{lang === "my" ? "အလုပ်ကြော်ငြာ တင်ရန် Dashboard ကို သွားပါ" : "Go to your Dashboard to post jobs and manage applications"}</p>
                <Button variant="default" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/employer/dashboard")}>
                  {lang === "my" ? "Dashboard သို့" : "Go to Dashboard"}
                </Button>
              </div>
            </>
          ) : (
            <>
          {/* Editorial intro */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Toolkit"}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground">
              {lang === "my"
                ? "သင့်အလုပ်ရှာဖွေမှုကို မြှင့်တင်ပါ"
                : "Land more interviews, faster."}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {lang === "my"
                ? "သင့် CV ကို တစ်ကြိမ်တင်ပြီး အောက်က ကိရိယာများကို ပေါင်းစပ်အသုံးပြုနိုင်ပါသည်။"
                : "Upload your CV once and reuse it across every tool below."}
            </p>
          </div>

          {/* Upload CV — primary anchor */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploadedFile ? (
            <div className="mb-5 rounded-2xl border border-emerald/30 bg-emerald/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald/10">
                  <File className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                    {lang === "my" ? "CV တင်ပြီး" : "CV ready"}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">{uploadedFile.name}</p>
                  <p className="text-[11px] text-muted-foreground">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground active:bg-muted"
                  >
                    {lang === "my" ? "အစားထိုး" : "Replace"}
                  </button>
                  <button
                    onClick={handleRemoveFile}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-destructive active:bg-destructive/5"
                  >
                    {lang === "my" ? "ဖယ်ရှား" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              disabled={uploading}
              className={`mb-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-7 text-center transition-colors disabled:opacity-50 ${
                dragActive ? "border-primary bg-primary/5" : "border-border bg-card active:bg-muted"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${dragActive ? "bg-primary/10" : "bg-muted"}`}>
                <Upload className={`h-5 w-5 ${dragActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </div>
              {uploading ? (
                <p className="text-sm font-medium text-foreground">{lang === "my" ? "တင်ပြီး ပြင်ဆင်နေသည်..." : "Uploading & analyzing CV…"}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {lang === "my" ? "CV ဖိုင်ကို တင်ရန်" : "Upload your CV to begin"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "my" ? "PDF / DOCX · အများဆုံး 10MB" : "PDF or DOCX · max 10MB · drag & drop supported"}
                  </p>
                </>
              )}
            </button>
          )}

          {/* Tool Cards — responsive grid */}
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {lang === "my" ? "ကိရိယာများ" : "Your toolkit"}
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {aiFeatures.length} {lang === "my" ? "ခု" : "tools"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {aiFeatures.map((f, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleToolClick(f.path)}
                className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:bg-muted hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg}`}>
                    <f.icon className={`h-5 w-5 ${f.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.statusBg} ${f.statusColor}`}>
                    {f.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight text-foreground">{f.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1 text-[11px] font-medium text-primary">
                  {lang === "my" ? "ဖွင့်ရန်" : "Open"}
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </div>
              </motion.button>
            ))}
          </div>

          {/* How it works — collapsed micro-steps */}
          <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {lang === "my" ? "လုပ်ငန်းစဉ်" : "How it works"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                lang === "my" ? "CV တင်ပါ" : "Upload CV",
                lang === "my" ? "ဘာသာ ထည့်ပါ" : "Add details",
                lang === "my" ? "ပြောင်းလဲမည်" : "Transform",
                lang === "my" ? "အသုံးပြုပါ" : "Apply",
              ].map((t, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{idx + 1}</span>
                  <p className="text-[11px] leading-snug text-foreground/80">{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {lang === "my" ? "သုံးနိုင်သည်" : "Works with"}
            </span>
            {["Upwork", "Fiverr", "LinkedIn", "Toptal", "Remote.co"].map((p) => (
              <span key={p} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-foreground/70">
                <Globe className="h-2.5 w-2.5" strokeWidth={1.5} /> {p}
              </span>
            ))}
          </div>
          </>
export default AiProfileBuilder;
