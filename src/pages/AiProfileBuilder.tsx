import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileText, PenLine, TrendingUp, ChevronRight, Upload, Globe, X, File, Check } from "lucide-react";
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

  const handleToolClick = (path: string, status: string) => {
    if (status === "Premium") {
      navigate("/premium");
      return;
    }
    // Pass uploaded CV file path to tools so they can parse it
    navigate(path, { state: { cvFilePath: uploadedFile?.filePath } });
  };

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: lang === "my" ? "PDF သို့မဟုတ် DOCX ဖိုင်သာ ခွင့်ပြုပါသည်" : "Only PDF or DOCX files allowed", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: lang === "my" ? "ဖိုင်သည် 10MB ထက် ကျော်လွန်နေပါသည်" : "File exceeds 10MB limit", variant: "destructive" });
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

      setUploadedFile({ name: file.name, size: file.size, url: urlData.publicUrl, filePath });
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
      status: "Ready",
      path: "/ai-tools/profile-builder",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-emerald/10",
      statusColor: "text-emerald",
    },
    {
      icon: PenLine,
      title: lang === "my" ? "Cover Letter ရေးသားရန်" : "Cover Letter Generator",
      desc: lang === "my" ? "အလုပ်တစ်ခုချင်းစီအတွက် စိတ်ကြိုက် cover letter ရေးသားပေးပါမည်" : "Generate tailored cover letters for each job application",
      status: "Premium",
      path: "/ai-tools/cover-letter",
      iconBg: "bg-emerald/10",
      iconColor: "text-emerald",
      statusBg: "bg-primary/10",
      statusColor: "text-primary",
    },
    {
      icon: TrendingUp,
      title: lang === "my" ? "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ" : "Skill Gap Analysis",
      desc: lang === "my" ? "သင်လိုချင်သော အလုပ်အတွက် မည်သည့် ကျွမ်းကျင်မှုများ လိုအပ်သေးသည်ကို ခွဲခြမ်းစိတ်ဖြာပေးပါမည်" : "Identify skill gaps between your profile and target roles",
      status: "Premium",
      path: "/ai-tools/skill-gap",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-primary/10",
      statusColor: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အသက်မွေးမှု Tools" : "Career Tools"} />
      <div className="px-5 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Subtitle */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === "my" ? "သင့်အသက်မွေးဝမ်းကြောင်းအတွက် အကူအညီများ" : "Tools to boost your career"}
            </p>
          </div>

          {/* How it works - includes CV upload step */}
          <div className="mb-5 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဘယ်လို အလုပ်လုပ်သလဲ?" : "How it works"}</h2>
            <div className="space-y-3">
              {[
                { step: "1", text: lang === "my" ? "သင့် CV ဖိုင်ကို PDF သို့မဟုတ် DOCX ဖြင့် တင်ပါ" : "Upload your CV as PDF or DOCX" },
                { step: "2", text: lang === "my" ? "သင့် CV သို့မဟုတ် အတွေ့အကြုံကို မြန်မာဘာသာဖြင့် ထည့်သွင်းပါ" : "Enter your experience in Burmese or English" },
                { step: "3", text: lang === "my" ? "နိုင်ငံတကာ အဆင့်မီ ပရိုဖိုင်အဖြစ် ပြောင်းလဲပေးမည်" : "We transform it into a global-standard profile" },
                { step: "4", text: lang === "my" ? "ပြင်ဆင်ပြီး Upwork, LinkedIn စသည်တို့တွင် အသုံးပြုပါ" : "Edit and use on Upwork, LinkedIn, etc." },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.step}</span>
                  <p className="text-xs text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload CV - moved above tools */}
          <div className="mb-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "CV တင်ရန်" : "Upload CV"}</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
                    <File className="h-6 w-6 text-emerald" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                    <span className="text-xs font-medium text-emerald">{lang === "my" ? "တင်ပြီး" : "Uploaded"}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    {lang === "my" ? "အစားထိုးတင်ရန်" : "Replace"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs text-destructive hover:bg-destructive/5"
                    onClick={handleRemoveFile}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    {lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                disabled={uploading}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-border bg-card"
                } active:bg-muted disabled:opacity-50`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${dragActive ? "bg-primary/10" : "bg-muted"}`}>
                  <Upload className={`h-6 w-6 ${dragActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                </div>
                {uploading ? (
                  <p className="text-sm font-medium text-foreground">{lang === "my" ? "တင်နေသည်..." : "Uploading..."}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {lang === "my" ? "CV ဖိုင်ကို ရွေးပါ သို့မဟုတ် ဤနေရာတွင် ချပါ" : "Click to select or drag & drop your CV"}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX · Max 10MB</p>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tool Cards */}
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ရရှိနိုင်သော Tools များ" : "Available Tools"}</h2>
          <div className="space-y-3">
            {aiFeatures.map((f, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleToolClick(f.path, f.status)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${f.iconBg}`}>
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.statusBg} ${f.statusColor}`}>{f.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </motion.button>
            ))}
          </div>

          {/* Supported Platforms */}
          <div className="mt-5 rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-foreground">{lang === "my" ? "ပံ့ပိုးသော Platform များ" : "Supported Platforms"}</p>
            <div className="flex flex-wrap gap-2">
              {["Upwork", "Fiverr", "LinkedIn", "Toptal", "Remote.co"].map((p) => (
                <span key={p} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3" strokeWidth={1.5} /> {p}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AiProfileBuilder;
