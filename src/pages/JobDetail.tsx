import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Building2, Globe, DollarSign, Shield, Bookmark, Share2, CheckCircle, X, Send, FileText, PenLine, Eye, Upload, Loader2, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { useJob, useSavedJobIds, useToggleSaveJob, useApplyToJob, useApplications } from "@/hooks/use-jobs";
import { useQuery } from "@tanstack/react-query";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: job, isLoading } = useJob(id);
  const { data: savedJobIds = [] } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();
  const applyMutation = useApplyToJob();

  const { data: applications = [] } = useApplications();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterMode, setCoverLetterMode] = useState<"none" | "manual" | "generated">("none");
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [selectedGeneratedResumeId, setSelectedGeneratedResumeId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Fetch user's CV documents
  const { data: cvDocuments = [] } = useQuery({
    queryKey: ["cv-documents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cv_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && showApplyModal,
  });

  // Fetch generated resumes from generated_documents
  const { data: generatedResumes = [] } = useQuery({
    queryKey: ["generated-resumes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("doc_type", "resume")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && showApplyModal,
  });

  // Fetch generated cover letters from generated_documents
  const { data: generatedCoverLetters = [] } = useQuery({
    queryKey: ["generated-cover-letters", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("doc_type", "cover_letter")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && showApplyModal,
  });

  const applied = id ? applications.some((a: any) => a.job_id === id) : false;
  const saved = id ? savedJobIds.includes(id) : false;

  const handleApply = () => {
    if (!id) return;
    applyMutation.mutate(
      {
        jobId: id,
        coverLetter: coverLetterMode !== "none" ? coverLetter : undefined,
        cvDocumentId: selectedCvId || undefined,
      },
      {
        onSuccess: () => {
          setShowApplyModal(false);
          setCoverLetter("");
          setCoverLetterMode("none");
          setSelectedCvId(null);
          setSelectedGeneratedResumeId(null);
          toast({
            title: lang === "my" ? "လျှောက်လွှာ တင်ပြီးပါပြီ ✓" : "Application submitted ✓",
            description: lang === "my" ? `${job?.company} မှ ပြန်ကြားပါမည်` : `${job?.company} will review your application`,
          });
        },
        onError: (error: any) => {
          toast({ title: lang === "my" ? "အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်" : "Something went wrong", description: error.message });
        },
      }
    );
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${job?.title} - ${job?.company}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
    }
  };

  const handleSave = () => {
    if (!id) return;
    toggleSaveMutation.mutate({ jobId: id, isSaved: saved });
    toast({
      title: saved
        ? (lang === "my" ? "သိမ်းဆည်းမှု ဖယ်ရှားပြီး" : "Removed from saved")
        : (lang === "my" ? "သိမ်းဆည်းပြီးပါပြီ" : "Saved!"),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} />
        <div className="flex flex-col items-center py-20 text-center px-5">
          <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "အလုပ် မတွေ့ပါ" : "Job not found"}</p>
        </div>
      </div>
    );
  }

  const salaryText = job.salary_min && job.salary_max
    ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}/mo`
    : job.salary_min ? `$${job.salary_min.toLocaleString()}+/mo`
    : "Negotiable";

  const requirementsList = (lang === "my" && job.requirements_my ? job.requirements_my : job.requirements || "")
    .split("\n")
    .filter(r => r.trim());

  const selectedCv = cvDocuments.find((d: any) => d.id === selectedCvId);
  const selectedGeneratedResume = generatedResumes.find((d: any) => d.id === selectedGeneratedResumeId);

  return (
    <div className="min-h-screen bg-background pb-40">
      <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Job header */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <Briefcase className="h-7 w-7 text-accent" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{lang === "my" && job.title_my ? job.title_my : job.title}</h1>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.is_verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-medium text-emerald">
                    <CheckCircle className="h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" strokeWidth={1.5} /> {job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: lang === "my" ? "လစာ" : "Salary", value: salaryText },
              { icon: MapPin, label: lang === "my" ? "တည်နေရာ" : "Location", value: job.location || "Remote" },
              { icon: Clock, label: lang === "my" ? "အမျိုးအစား" : "Type", value: job.job_type || "Full-time" },
              { icon: Globe, label: lang === "my" ? "ငွေပေးချေမှု" : "Payment", value: (job.payment_methods || []).join(", ") || "—" },
            ].map((info) => (
              <div key={info.label} className="rounded-xl border border-border bg-card p-3 shadow-card">
                <info.icon className="mb-1 h-4 w-4 text-accent" strokeWidth={1.5} />
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
                <p className="text-xs font-semibold text-foreground">{info.value}</p>
              </div>
            ))}
          </div>

          {job.is_diaspora_safe && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald/5 p-3.5">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-emerald">Diaspora Safe</p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my" ? "သံရုံးစာရွက်စာတမ်း မလိုအပ်ပါ" : "No embassy documentation required"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "အလုပ်အကြောင်း" : "Description"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {lang === "my" && job.description_my ? job.description_my : job.description}
            </p>
          </div>

          {requirementsList.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "လိုအပ်ချက်များ" : "Requirements"}</h2>
              <ul className="space-y-2">
                {requirementsList.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" strokeWidth={1.5} />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(job.skills || []).length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
              <div className="flex flex-wrap gap-2">
                {(job.skills || []).map((s) => (
                  <span key={s} className="rounded-lg bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
                <Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{job.company}</h3>
                <p className="text-xs text-muted-foreground">{job.location} · {job.category}</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            👥 {lang === "my" ? `လျှောက်ထားသူ ${job.applicant_count || 0} ဦး` : `${job.applicant_count || 0} applicants`}
          </p>
        </motion.div>
      </div>

      {/* Enhanced Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setShowApplyModal(false)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}</h2>
                <button onClick={() => setShowApplyModal(false)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">{job.title} · {job.company}</p>

              {/* Profile badge */}
              <div className="mb-5 rounded-xl bg-emerald/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-emerald">{lang === "my" ? "ThweSone ပရိုဖိုင်ဖြင့် လျှောက်ထားမည်" : "Applying with your ThweSone profile"}</p>
                </div>
              </div>

              {/* Resume/CV Selection */}
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <label className="text-sm font-semibold text-foreground">{lang === "my" ? "CV/Resume ရွေးချယ်ပါ" : "Select Resume"}</label>
                </div>

                {(cvDocuments.length > 0 || generatedResumes.length > 0) ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {/* Only latest uploaded CV */}
                    {cvDocuments.slice(0, 1).map((doc: any) => {
                      const isSelected = selectedCvId === doc.id && !selectedGeneratedResumeId;
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between rounded-xl border p-3 transition-colors cursor-pointer ${
                            isSelected ? "border-primary bg-primary/5" : "border-border active:bg-muted"
                          }`}
                          onClick={() => { setSelectedCvId(isSelected ? null : doc.id); setSelectedGeneratedResumeId(null); }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                              <Upload className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {lang === "my" ? "တင်ထားသော CV" : "Original CV"} · {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : ""} · {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.file_url && (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                const storagePath = doc.file_url.split('/cv-documents/').pop();
                                if (!storagePath) return;
                                const { data } = await supabase.storage.from('cv-documents').createSignedUrl(storagePath, 300);
                                if (data?.signedUrl) {
                                  setPreviewUrl(data.signedUrl);
                                  setPreviewContent(null);
                                  setPreviewTitle(doc.file_name);
                                } else {
                                  toast({ title: lang === "my" ? "ဖိုင်ဖွင့်၍မရပါ" : "Could not open file", variant: "destructive" });
                                }
                              }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted active:bg-muted" title={lang === "my" ? "ကြည့်ရှုရန်" : "View"}>
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            )}
                            {isSelected && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={2} />}
                          </div>
                        </div>
                      );
                    })}

                    {/* Generated Resumes */}
                    {generatedResumes.map((doc: any) => {
                      const isSelected = selectedGeneratedResumeId === doc.id;
                      const meta = doc.metadata as any;
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between rounded-xl border p-3 transition-colors cursor-pointer ${
                            isSelected ? "border-primary bg-primary/5" : "border-border active:bg-muted"
                          }`}
                          onClick={() => { setSelectedGeneratedResumeId(isSelected ? null : doc.id); setSelectedCvId(null); }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? "bg-primary/10" : "bg-emerald/10"}`}>
                              <Sparkles className={`h-4 w-4 ${isSelected ? "text-primary" : "text-emerald"}`} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{doc.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {lang === "my" ? "ဖန်တီးထားသော ပရိုဖိုင်" : "Generated Profile"}{meta?.platform ? ` · ${meta.platform}` : ""} · {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setPreviewContent(doc.content); setPreviewTitle(doc.title); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title={lang === "my" ? "ကြည့်ရှုရန်" : "View"}>
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            {isSelected && <CheckCircle className="h-4 w-4 text-primary" strokeWidth={2} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                    <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-xs text-muted-foreground">
                      {lang === "my" ? "CV မတင်ရသေးပါ — Career Tools မှ CV တင်ပါ" : "No CV uploaded yet — upload via Career Tools"}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); navigate("/ai-tools"); }}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                      {lang === "my" ? "CV တင်ရန်" : "Upload CV"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Cover Letter Section */}
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-emerald" strokeWidth={1.5} />
                  <label className="text-sm font-semibold text-foreground">{lang === "my" ? "Cover Letter" : "Cover Letter"}</label>
                  <span className="text-[10px] text-muted-foreground">({lang === "my" ? "ရွေးချယ်ပိုင်ခွင့်" : "Optional"})</span>
                </div>

                {generatedCoverLetters.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                    {generatedCoverLetters.map((doc: any) => {
                      const isSelected = coverLetter === doc.content && coverLetterMode === "generated";
                      const meta = doc.metadata as any;
                      return (
                        <div
                          key={doc.id}
                          className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "border-border active:bg-muted"
                          }`}
                          onClick={() => {
                            if (isSelected) { setCoverLetter(""); setCoverLetterMode("none"); }
                            else { setCoverLetter(doc.content); setCoverLetterMode("generated"); }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${isSelected ? "bg-primary/10" : "bg-emerald/10"}`}>
                                <PenLine className={`h-4 w-4 ${isSelected ? "text-primary" : "text-emerald"}`} strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{doc.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {meta?.tone ? `${meta.tone} · ` : ""}{new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setPreviewContent(doc.content); setPreviewTitle(doc.title); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title={lang === "my" ? "ကြည့်ရှုရန်" : "View"}>
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary" strokeWidth={2} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full"
                  onClick={() => {
                    if (coverLetterMode === "manual") { setCoverLetterMode("none"); setCoverLetter(""); }
                    else { setCoverLetterMode("manual"); }
                  }}
                >
                  <PenLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                  {coverLetterMode === "manual"
                    ? (lang === "my" ? "ပိတ်ရန်" : "Cancel")
                    : (lang === "my" ? "ကိုယ်တိုင်ရေးရန်" : "Write your own")}
                </Button>

                {coverLetterMode === "manual" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
                    <Textarea
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      placeholder={lang === "my" ? "ဤအလုပ်အတွက် သင်ဘာကြောင့် သင့်တော်သည်ကို ရေးပါ..." : "Tell them why you're a great fit..."}
                      className="min-h-[120px] rounded-xl border-border text-sm"
                    />
                  </motion.div>
                )}
              </div>

              {/* Summary */}
              <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {lang === "my" ? "လျှောက်လွှာ အကျဉ်းချုပ်" : "Application Summary"}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} />
                    <span className="text-foreground">{lang === "my" ? "ThweSone ပရိုဖိုင်" : "ThweSone Profile"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {selectedCv ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} />
                        <span className="text-foreground truncate">{selectedCv.file_name}</span>
                      </>
                    ) : selectedGeneratedResume ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} />
                        <span className="text-foreground truncate">{selectedGeneratedResume.title}</span>
                        <button onClick={() => { setPreviewContent(selectedGeneratedResume.content); setPreviewTitle(selectedGeneratedResume.title); }} className="ml-auto text-[10px] font-medium text-primary">
                          {lang === "my" ? "ကြည့်ရန်" : "Preview"}
                        </button>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                        <span className="text-muted-foreground">{lang === "my" ? "Resume မပါဝင်ပါ" : "No resume attached"}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {coverLetterMode !== "none" && coverLetter ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} />
                        <span className="text-foreground">{lang === "my" ? "Cover Letter ပါဝင်သည်" : "Cover letter included"}</span>
                        <button
                          onClick={() => {
                            setPreviewContent(coverLetter);
                            setPreviewTitle(lang === "my" ? "Cover Letter" : "Cover Letter");
                          }}
                          className="ml-auto text-[10px] font-medium text-primary"
                        >
                          {lang === "my" ? "ကြည့်ရန်" : "Preview"}
                        </button>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                        <span className="text-muted-foreground">{lang === "my" ? "Cover Letter မပါဝင်ပါ" : "No cover letter"}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={handleApply} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {lang === "my" ? "တင်နေသည်..." : "Submitting..."}
                  </span>
                ) : (
                  <>
                    <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "လျှောက်လွှာ တင်ရန်" : "Submit Application"}
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Preview Modal */}
      <AnimatePresence>
        {previewContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 p-5" onClick={() => setPreviewContent(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5" onClick={e => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{previewTitle}</h3>
                <button onClick={() => setPreviewContent(null)} className="rounded-lg p-1 active:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </div>
              <div className="rounded-xl bg-background p-4">
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{previewContent}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPreviewContent(null)}>
                {lang === "my" ? "ပိတ်ရန်" : "Close"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {applied ? (
            <Button variant="outline" size="lg" className="flex-1 rounded-xl text-emerald border-emerald" disabled>
              <CheckCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "လျှောက်ထားပြီး" : "Applied"}
            </Button>
          ) : (
            <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setShowApplyModal(true)}>
              {lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
