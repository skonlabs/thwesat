import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Building2, Globe, DollarSign, Shield, Bookmark, Share2, CheckCircle, X, Send, FileText, PenLine, Eye, Upload, Loader2, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { useJob, useSavedJobIds, useToggleSaveJob, useApplyToJob, useApplications } from "@/hooks/use-jobs";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useQuery } from "@tanstack/react-query";
import { formatJobSalary, translateJobCategories, translateJobCategory, translateJobLocation, translateJobTags, translateJobTitle, translateJobType, translatePaymentMethods } from "@/lib/job-localization";
import { pickLocalized } from "@/lib/i18n";
import { shareJobLink } from "@/lib/share-job";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSaved = searchParams.get("from") === "saved";
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: job, isLoading } = useJob(id);
  const { data: savedJobIds = [] } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();
  const applyMutation = useApplyToJob();
  const { startConversation } = useStartConversation();

  const { data: applications = [] } = useApplications();
  const { data: employerDetails } = useQuery({
    queryKey: ["job-employer-details", job?.employer_id],
    queryFn: async () => {
      if (!job?.employer_id) return null;

      const [profileRes, employerRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, headline, avatar_url, location, website")
          .eq("id", job.employer_id)
          .maybeSingle(),
        supabase
          .from("employer_profiles")
          .select("company_name, company_description, company_website, industry, company_size, hq_country, is_verified")
          .eq("id", job.employer_id)
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (employerRes.error) throw employerRes.error;

      return {
        profile: profileRes.data,
        employer: employerRes.data,
      };
    },
    enabled: !!job?.employer_id,
  });
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterMode, setCoverLetterMode] = useState<"none" | "manual" | "generated">("none");
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [selectedGeneratedResumeId, setSelectedGeneratedResumeId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [parsingCvId, setParsingCvId] = useState<string | null>(null);

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

  // Application throttle: find any application for this job
  const myApplication = id ? applications.find((a: any) => a.job_id === id) : null;
  // "active" means NOT withdrawn/rejected — user cannot re-apply
  const hasActiveApplication = !!myApplication && !["withdrawn", "rejected"].includes((myApplication as any)?.status);
  // Previously applied but was withdrawn/rejected — allow re-apply with different label
  const hadPreviousApplication = !!myApplication && ["withdrawn", "rejected"].includes((myApplication as any)?.status);
  const saved = id ? savedJobIds.includes(id) : false;

  // Mutual exclusivity: clear selectedGeneratedResumeId when selectedCvId is set and vice versa
  useEffect(() => {
    if (selectedCvId) setSelectedGeneratedResumeId(null);
  }, [selectedCvId]);
  useEffect(() => {
    if (selectedGeneratedResumeId) setSelectedCvId(null);
  }, [selectedGeneratedResumeId]);
  const toneLabels: Record<string, { my: string; en: string }> = {
    professional: { my: "ပရော်ဖက်ရှင်နယ်", en: "Professional" },
    friendly: { my: "ဖော်ရွေသော", en: "Friendly" },
    confident: { my: "ယုံကြည်မှုရှိသော", en: "Confident" },
    enthusiastic: { my: "စိတ်အားထက်သန်သော", en: "Enthusiastic" },
  };

  const handleApply = () => {
    if (!id) return;
    if (!selectedCvId && !selectedGeneratedResumeId) {
      toast({
        title: lang === "my" ? "ကိုယ်ရေးမှတ်တမ်း လိုအပ်ပါသည်" : "Resume required",
        description:
          lang === "my"
            ? "လျှောက်ထားရန် ကိုယ်ရေးမှတ်တမ်း တင်ထားပါ သို့မဟုတ် ရွေးချယ်ပါ။"
            : "Please upload or select a resume before applying.",
        variant: "destructive",
      });
      return;
    }
    if (coverLetterMode === "manual" && coverLetter.trim().length < 30) {
      toast({
        title: lang === "my" ? "အလုပ်လျှောက်လွှာ တိုသည်" : "Cover letter too short",
        description:
          lang === "my"
            ? "အနည်းဆုံး စာလုံး ၃၀ ထည့်ပါ သို့မဟုတ် ဖျက်ပြီး ပိတ်ပါ။"
            : "Please write at least 30 characters or cancel the cover letter.",
        variant: "destructive",
      });
      return;
    }
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
        },
        onError: (error: any) => {
        },
      }
    );
  };

  const [isSharing, setIsSharing] = useState(false);
  const handleShare = async () => {
    if (!job || !id) return;
    setIsSharing(true);
    try {
      await shareJobLink({
        jobId: id,
        title: translateJobTitle(job.title, job.title_my, lang),
        company: job.company,
        lang,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = () => {
    if (!id) return;
    toggleSaveMutation.mutate({ jobId: id, isSaved: saved });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} backPath={fromSaved ? "/jobs/saved" : "/jobs"} />
        <div className="px-5">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} backPath="/jobs" />
        <div className="flex flex-col items-center py-20 text-center px-5">
          <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "အလုပ် မတွေ့ပါ" : "Job not found"}</p>
        </div>
      </div>
    );
  }

  const salaryText = formatJobSalary(job, lang);
  const displayTitle = translateJobTitle(job.title, job.title_my, lang);
  const isOwnJob = user?.id === job.employer_id;
  const employerCompanyName = employerDetails?.employer?.company_name || job.company;
  const employerHeadline = employerDetails?.profile?.headline || employerDetails?.employer?.industry || translateJobCategory(job.category, lang);

  const requirementsList = pickLocalized(job.requirements, job.requirements_my, lang)
    .split("\n")
    .filter(r => r.trim());

  const selectedCv = cvDocuments.find((d: any) => d.id === selectedCvId);
  const selectedGeneratedResume = generatedResumes.find((d: any) => d.id === selectedGeneratedResumeId);

  return (
    <div className="min-h-screen bg-background pb-40">
        <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} backPath={fromSaved ? "/jobs/saved" : "/jobs"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Job header */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <Briefcase className="h-7 w-7 text-accent" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{displayTitle}</h1>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {translateJobCategories(job, lang).map((cat) => (
                  <span key={cat} className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent-foreground/80">
                    {cat}
                  </span>
                ))}
                {job.is_verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-medium text-emerald">
                    <CheckCircle className="h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" strokeWidth={1.5} /> {job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}
                </span>
                {(() => {
                  const m = (job as any).application_method || "platform";
                  const label = m === "external" ? (lang === "my" ? "ပြင်ပလင့်ခ်" : "External URL") : m === "email" ? (lang === "my" ? "အီးမေးလ်ဖြင့်" : "Via Email") : (lang === "my" ? "ThweSat မှ" : "Via Platform");
                  return (
                    <span className="flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <Send className="h-3 w-3" strokeWidth={1.5} /> {label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: lang === "my" ? "လစာ" : "Salary", value: salaryText },
                { icon: MapPin, label: lang === "my" ? "တည်နေရာ" : "Location", value: translateJobLocation(job.location, lang) },
                { icon: Clock, label: lang === "my" ? "အမျိုးအစား" : "Type", value: translateJobType(job.role_type || job.job_type, lang) },
                { icon: Globe, label: lang === "my" ? "ငွေပေးချေမှု" : "Payment", value: translatePaymentMethods(job.payment_methods, lang).join(", ") || "—" },
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
                <p className="text-xs font-semibold text-emerald">{lang === "my" ? "ပြည်ပ လုံခြုံ" : "Diaspora Safe"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my" ? "သံရုံးစာရွက်စာတမ်း မလိုအပ်ပါ" : "No embassy documentation required"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "အလုပ်အကြောင်း" : "Description"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {pickLocalized(job.description, job.description_my, lang)}
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
                {translateJobTags(job.skills, lang).map((s) => (
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
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{employerCompanyName}</h3>
                  {employerDetails?.employer?.is_verified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald">
                      <CheckCircle className="h-2.5 w-2.5" strokeWidth={2} />
                      {lang === "my" ? "အတည်ပြု" : "Verified"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{employerHeadline}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium text-foreground">{lang === "my" ? "တည်နေရာ" : "Location"}</span>
                <p className="mt-0.5">{employerDetails?.employer?.hq_country || translateJobLocation(job.location, lang)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium text-foreground">{lang === "my" ? "အရွယ်အစား" : "Company Size"}</span>
                <p className="mt-0.5">{employerDetails?.employer?.company_size || "—"}</p>
              </div>
            </div>

            {employerDetails?.employer?.company_description && (
              <p className="mt-3 text-xs leading-relaxed text-foreground/80">
                {employerDetails.employer.company_description}
              </p>
            )}

            {(employerDetails?.employer?.company_website || employerDetails?.profile?.website) && (
              <a
                href={employerDetails?.employer?.company_website || employerDetails?.profile?.website || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {lang === "my" ? "ကုမ္ပဏီဝဘ်ဆိုဒ် ကြည့်ရန်" : "View company website"}
              </a>
            )}
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
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              {/* Header */}
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}</h2>
                <button onClick={() => setShowApplyModal(false)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">{displayTitle} · {job.company}</p>

              {/* Profile badge */}
              <div className="mb-5 rounded-xl bg-emerald/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-emerald">{lang === "my" ? "ThweSat ပရိုဖိုင်ဖြင့် လျှောက်ထားမည်" : "Applying with your ThweSat profile"}</p>
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

                                setPreviewTitle(doc.file_name);
                                setPreviewContent(lang === "my" ? "CV ကို ဖတ်နေသည်..." : "Loading CV...");

                                try {
                                  const { data, error } = await supabase.functions.invoke("parse-cv", {
                                    body: { file_path: storagePath },
                                  });
                                  if (error) throw error;

                                  const parsed = data?.data;
                                  const formatted = [
                                    parsed?.name ? `${lang === "my" ? "အမည်" : "Name"}: ${parsed.name}` : "",
                                    parsed?.title ? `${lang === "my" ? "ရာထူး" : "Title"}: ${parsed.title}` : "",
                                    parsed?.summary ? `${lang === "my" ? "အကျဉ်းချုပ်" : "Summary"}:\n${parsed.summary}` : "",
                                    parsed?.skills?.length ? `${lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}: ${parsed.skills.join(", ")}` : "",
                                    parsed?.experiences?.length
                                      ? `${lang === "my" ? "အတွေ့အကြုံ" : "Experience"}:\n${parsed.experiences
                                          .map((ex: any) => `• ${[ex.role, ex.company].filter(Boolean).join(lang === "my" ? " · " : " at ")} ${ex.duration ? `(${ex.duration})` : ""}${ex.description ? `\n  ${ex.description}` : ""}`)
                                          .join("\n\n")}`
                                      : "",
                                    parsed?.education?.length
                                      ? `${lang === "my" ? "ပညာရေး" : "Education"}:\n${parsed.education
                                          .map((ed: any) => `• ${[ed.degree, ed.institution].filter(Boolean).join(" — ")} ${ed.year ? `(${ed.year})` : ""}`)
                                          .join("\n")}`
                                      : "",
                                    parsed?.other ? `${lang === "my" ? "အခြား" : "Other"}:\n${parsed.other}` : "",
                                  ]
                                    .filter(Boolean)
                                    .join("\n\n");

                                  setPreviewContent(formatted || (lang === "my" ? "ဤ CV ကို ကြည့်ရှုရန် အချက်အလက် မရရှိပါ" : "No preview available for this CV."));
                                } catch {
                                  setPreviewContent(null);
                                  toast({ title: lang === "my" ? "CV ကို မကြည့်ရှုနိုင်ပါ" : "Could not preview CV", variant: "destructive" });
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
                  <label className="text-sm font-semibold text-foreground">{lang === "my" ? "အလုပ်လျှောက်လွှာ" : "Cover Letter"}</label>
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
                                  {meta?.tone ? `${lang === "my" ? (toneLabels[meta.tone]?.my || meta.tone) : (toneLabels[meta.tone]?.en || meta.tone)} · ` : ""}{new Date(doc.created_at).toLocaleDateString()}
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
                    <span className="text-foreground">{lang === "my" ? "ThweSat ပရိုဖိုင်" : "ThweSat Profile"}</span>
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
                        <span className="text-foreground">{lang === "my" ? "အလုပ်လျှောက်လွှာ ပါဝင်သည်" : "Cover letter included"}</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                        <span className="text-muted-foreground">{lang === "my" ? "အလုပ်လျှောက်လွှာ မပါဝင်ပါ" : "No cover letter"}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              {!selectedCvId && !selectedGeneratedResumeId && (
                <p className="text-xs text-destructive text-center">
                  {lang === "my" ? "လျှောက်ထားရန် ကိုယ်ရေးမှတ်တမ်း ရွေးချယ်ပါ" : "Select or upload a resume to apply"}
                </p>
              )}
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={handleApply} disabled={applyMutation.isPending || (!selectedCvId && !selectedGeneratedResumeId)}>
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-5" onClick={e => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground truncate">{previewTitle}</h3>
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
        <div className="mx-auto flex w-full max-w-md items-center gap-2">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground active:bg-muted disabled:opacity-60"
            title={lang === "my" ? "မျှဝေရန်" : "Share"}
            aria-label={lang === "my" ? "မျှဝေရန်" : "Share"}
          >
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" strokeWidth={1.5} />}
          </button>
          <button
            onClick={handleSave}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${saved ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"} active:bg-muted`}
            title={lang === "my" ? "သိမ်းရန်" : "Save"}
            aria-label={lang === "my" ? "သိမ်းရန်" : "Save"}
          >
            <Bookmark className="h-4 w-4" strokeWidth={1.5} fill={saved ? "currentColor" : "none"} />
          </button>
          {!isOwnJob && (
            <Button variant="outline" size="lg" className="rounded-xl" onClick={() => startConversation(job.employer_id)}>
              <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
            </Button>
          )}
          {applied ? (
            <Button variant="outline" size="lg" className="flex-1 rounded-xl text-emerald border-emerald" disabled>
              <CheckCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "လျှောက်ထားပြီး" : "Applied"}
            </Button>
          ) : (
            <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setShowApplyModal(true)}>
              {lang === "my" ? "လျှောက်ထားရန်" : "Apply"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
