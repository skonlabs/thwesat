import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Building2, Globe, Shield, Bookmark, Share2, CheckCircle, X, Send, FileText, PenLine, Eye, Loader2, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import SpendConfirmSheet from "@/components/wallet/SpendConfirmSheet";
import { useJob, useSavedJobIds, useToggleSaveJob, useApplyToJob, useApplications } from "@/hooks/use-jobs";
import { useActionPrice } from "@/hooks/use-wallet";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJobSalary, translateJobCategories, translateJobCategory, translateJobLocation, translateJobTags, translateJobTitle, translateJobType, translatePaymentMethods } from "@/lib/job-localization";
import { pickLocalized } from "@/lib/i18n";
import { shareJobLink } from "@/lib/share-job";
import MentorCoachCue from "@/components/MentorCoachCue";

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
  const [priorityApply, setPriorityApply] = useState(false);
  const [priorityConfirmOpen, setPriorityConfirmOpen] = useState(false);
  const [coverLetterSpendOpen, setCoverLetterSpendOpen] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const priorityPrice = useActionPrice("priority_application");
  const cvRewritePrice = useActionPrice("cv_rewrite");
  const coverLetterPrice = useActionPrice("cover_letter");

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

  // Auto-select a resume when the apply modal opens (primary CV → most recent CV → most recent generated)
  useEffect(() => {
    if (!showApplyModal) return;
    if (selectedCvId || selectedGeneratedResumeId) return;
    if (cvDocuments.length > 0) {
      const primary = (cvDocuments as any[]).find((d) => d.is_primary) ?? cvDocuments[0];
      setSelectedCvId(primary.id);
    } else if (generatedResumes.length > 0) {
      setSelectedGeneratedResumeId((generatedResumes as any[])[0].id);
    }
  }, [showApplyModal, cvDocuments, generatedResumes, selectedCvId, selectedGeneratedResumeId]);

  // Auto-open apply modal when returning from generators (?openApply=1) and refresh generated docs
  const queryClient = useQueryClient();
  useEffect(() => {
    if (searchParams.get("openApply") === "1" && user) {
      setShowApplyModal(true);
      queryClient.invalidateQueries({ queryKey: ["generated-resumes", user.id] });
      queryClient.invalidateQueries({ queryKey: ["generated-cover-letters", user.id] });
      // Clean the param so refresh doesn't re-open
      const next = new URLSearchParams(searchParams);
      next.delete("openApply");
      navigate(`/jobs/${id}${next.toString() ? `?${next.toString()}` : ""}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const submitApplication = () => {
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
          setPriorityApply(false);
        },
      }
    );
  };

  const runGenerateCoverLetter = async () => {
    if (!user || !job) return;
    setGeneratingCoverLetter(true);
    try {
      // Build experience context from selected resume
      let yourExperience = "";
      let yourName = "";
      if (selectedCvId) {
        const cv: any = (cvDocuments as any[]).find((d) => d.id === selectedCvId);
        if (cv?.file_url) {
          const storagePath = cv.file_url.split("/cv-documents/").pop() || cv.file_url;
          try {
            const { data: parsed } = await supabase.functions.invoke("parse-cv", {
              body: { file_path: storagePath },
            });
            const p = parsed?.data;
            if (p) {
              yourName = p.name || "";
              yourExperience = [
                ...(p.experiences || []).map((ex: any) =>
                  [ex.role, ex.company, ex.duration].filter(Boolean).join(" at ") +
                  (ex.description ? ` — ${ex.description}` : "")
                ),
                ...(p.skills?.length ? [`Skills: ${p.skills.join(", ")}`] : []),
                ...(p.summary ? [p.summary] : []),
              ].join("\n");
            }
          } catch (e) {
            console.warn("CV parse failed, generating without resume detail", e);
          }
        }
      } else if (selectedGeneratedResumeId) {
        const r: any = (generatedResumes as any[]).find((d) => d.id === selectedGeneratedResumeId);
        if (r?.content) yourExperience = String(r.content).substring(0, 3000);
      }

      const jobDescription = [
        (job as any).description || "",
        (job as any).requirements ? `Requirements: ${(job as any).requirements}` : "",
      ].filter(Boolean).join("\n").substring(0, 2000);

      const companyName = (job as any)?.companies?.name || (job as any)?.company || "";

      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          jobTitle: job.title,
          company: companyName,
          jobDescription,
          yourName: yourName || (user as any)?.user_metadata?.display_name || "",
          yourExperience,
          tone: "professional",
        },
      });
      if (error) throw error;
      const letter = data?.data?.letter;
      if (!letter) throw new Error("No cover letter returned");

      // Persist for re-use
      await supabase.from("generated_documents").insert({
        user_id: user.id,
        doc_type: "cover_letter",
        title: `${lang === "my" ? "အလုပ်လျှောက်လွှာ" : "Cover Letter"} — ${job.title || ""} at ${companyName || ""}`,
        content: letter,
        metadata: { jobTitle: job.title, company: companyName, tone: "professional", jobId: id || null },
      });
      queryClient.invalidateQueries({ queryKey: ["generated-cover-letters", user.id] });

      setCoverLetter(letter);
      setCoverLetterMode("generated");
    } catch (err: any) {
      console.error("Inline cover letter generation failed", err);
      toast({
        title: lang === "my" ? "ဖန်တီး၍ မရပါ" : "Generation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleApply = () => {
    if (!id) return;
    if (!selectedCvId && !selectedGeneratedResumeId) {
      toast({
        title: lang === "my" ? "ကိုယ်ရေးမှတ်တမ်း လိုအပ်ပါသည်" : "Resume required",
        description: lang === "my" ? "လျှောက်ထားရန် ကိုယ်ရေးမှတ်တမ်း တင်ထားပါ သို့မဟုတ် ရွေးချယ်ပါ။" : "Please upload or select a resume before applying.",
        variant: "destructive",
      });
      return;
    }
    if (coverLetterMode === "manual" && coverLetter.trim().length < 30) {
      toast({
        title: lang === "my" ? "အလုပ်လျှောက်လွှာ တိုသည်" : "Cover letter too short",
        description: lang === "my" ? "အနည်းဆုံး စာလုံး ၃၀ ထည့်ပါ သို့မဟုတ် ဖျက်ပြီး ပိတ်ပါ။" : "Please write at least 30 characters or cancel the cover letter.",
        variant: "destructive",
      });
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const confirmAndSubmit = () => {
    setSubmitConfirmOpen(false);
    if (priorityApply) {
      // Defer opening the Sheet so the AlertDialog fully unmounts and Radix
      // releases the body pointer-events lock; otherwise the confirm button
      // inside SpendConfirmSheet appears unclickable.
      setTimeout(() => setPriorityConfirmOpen(true), 150);
      return;
    }
    setTimeout(() => submitApplication(), 0);
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

  const actionButtons = (
    <>
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
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${saved ? "border-emerald bg-emerald/10 text-emerald" : "border-border bg-card text-muted-foreground"} active:bg-muted`}
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
      {(() => {
        const method = ((job as any).application_method || "platform") as "platform" | "external" | "email";
        const externalUrl = ((job as any).external_url || "").trim();
        if (method === "external" && externalUrl) {
          return (
            <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => window.open(externalUrl, "_blank", "noopener,noreferrer")}>
              <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {lang === "my" ? "ပြင်ပလင့်ခ်တွင် လျှောက်ထားရန်" : "Apply on external site"}
            </Button>
          );
        }
        if (method === "email" && externalUrl) {
          return (
            <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => { window.location.href = `mailto:${externalUrl}?subject=${encodeURIComponent(`Application: ${displayTitle}`)}`; }}>
              <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {lang === "my" ? "အီးမေးလ်ဖြင့် လျှောက်ထားရန်" : "Apply via email"}
            </Button>
          );
        }
        if (hasActiveApplication) {
          return (
            <Button variant="outline" size="lg" className="flex-1 rounded-xl text-emerald border-emerald" disabled>
              <CheckCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "လျှောက်ထားပြီး" : "You have already applied to this job"}
            </Button>
          );
        }
        return (
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setShowApplyModal(true)}>
            {hadPreviousApplication
              ? (lang === "my" ? "ယခင် လျှောက်ထားဖူး — ထပ်မံ လျှောက်ထားမည်?" : "You applied previously. Apply again?")
              : (lang === "my" ? "လျှောက်ထားရန်" : "Apply")}
          </Button>
        );
      })()}
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-36 md:pb-12">
      <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} backPath={fromSaved ? "/jobs/saved" : "/jobs"} />

      <main className="mx-auto w-full max-w-4xl px-4 pb-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <section className="border-b border-border pb-5">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/15 md:h-14 md:w-14">
                <Briefcase className="h-6 w-6 text-accent md:h-7 md:w-7" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold leading-tight text-foreground md:text-3xl">{displayTitle}</h1>
                    <button
                      type="button"
                      onClick={() => job.employer_id && navigate(`/company/${job.employer_id}`)}
                      className="mt-1 inline-flex max-w-full items-center gap-1.5 text-left text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{job.company}</span>
                      {job.is_verified && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald" strokeWidth={2} />}
                    </button>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/25 px-3 py-2 md:w-56">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{lang === "my" ? "လစာ" : "Salary"}</p>
                    <p className="mt-0.5 text-base font-bold leading-snug text-foreground">{salaryText}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {translateJobCategories(job, lang).map((cat) => (
                    <span key={cat} className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent-foreground/80">
                      {cat}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" strokeWidth={1.5} /> {job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}
                  </span>
                  {(() => {
                    const m = (job as any).application_method || "platform";
                    const label = m === "external" ? (lang === "my" ? "ပြင်ပလင့်ခ်" : "External URL") : m === "email" ? (lang === "my" ? "အီးမေးလ်ဖြင့်" : "Via Email") : (lang === "my" ? "ThweSat မှ" : "Via Platform");
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
                        <Send className="h-3 w-3" strokeWidth={1.5} /> {label}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-4 hidden flex-wrap items-center gap-2 md:flex">
                  {actionButtons}
                </div>
              </div>
            </div>
          </section>

          <section className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, label: lang === "my" ? "တည်နေရာ" : "Location", value: translateJobLocation(job.location, lang) },
              { icon: Clock, label: lang === "my" ? "အလုပ်အမျိုးအစား" : "Type", value: translateJobType(job.role_type || job.job_type, lang) },
              { icon: Globe, label: lang === "my" ? "ငွေပေးချေမှု" : "Payment", value: translatePaymentMethods(job.payment_methods, lang).join(", ") || "—" },
              { icon: Briefcase, label: lang === "my" ? "လျှောက်ထားသူ" : "Applicants", value: `${job.applicant_count || 0}` },
            ].map((info) => (
              <div key={info.label} className="bg-background p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <info.icon className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  <p className="text-[10px] font-semibold uppercase">{info.label}</p>
                </div>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{info.value}</p>
              </div>
            ))}
          </section>

          {job.is_diaspora_safe && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald/20 bg-emerald/5 p-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-emerald">{lang === "my" ? "ပြည်ပ လုံခြုံ" : "Diaspora Safe"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my" ? "သံရုံးစာရွက်စာတမ်း မလိုအပ်ပါ" : "No embassy documentation required"}
                </p>
              </div>
            </div>
          )}

          <article className="divide-y divide-border">
            <section className="grid gap-3 py-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6 md:py-6">
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">{lang === "my" ? "အလုပ်အကြောင်း" : "Description"}</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-foreground/85 md:text-[15px]">
                {pickLocalized(job.description, job.description_my, lang)}
              </p>
            </section>

            {requirementsList.length > 0 && (
              <section className="grid gap-3 py-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6 md:py-6">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">{lang === "my" ? "လိုအပ်ချက်များ" : "Requirements"}</h2>
                <ul className="space-y-2.5">
                  {requirementsList.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-6 text-foreground/85 md:text-[15px]">
                      <CheckCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald" strokeWidth={1.5} />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(job.skills || []).length > 0 && (
              <section className="grid gap-3 py-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6 md:py-6">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
                <div className="flex flex-wrap gap-2">
                  {translateJobTags(job.skills, lang).map((s) => (
                    <span key={s} className="rounded-lg bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
                  ))}
                </div>
              </section>
            )}
          </article>

          <section className="border-t border-border py-5">
            <button
              type="button"
              onClick={() => job.employer_id && navigate(`/company/${job.employer_id}`)}
              className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80 active:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold text-foreground">{employerCompanyName}</h3>
                  {employerDetails?.employer?.is_verified && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald" strokeWidth={2} />}
                </div>
                <p className="truncate text-xs text-muted-foreground">{employerHeadline}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-primary">{lang === "my" ? "ကြည့်ရန်" : "View →"}</span>
            </button>

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase">{lang === "my" ? "ရုံးချုပ်" : "HQ"}</span>
                <p className="mt-0.5 font-medium text-foreground">{employerDetails?.employer?.hq_country || "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase">{lang === "my" ? "အရွယ်" : "Size"}</span>
                <p className="mt-0.5 font-medium text-foreground">{employerDetails?.employer?.company_size || "—"}</p>
              </div>
            </div>

            {employerDetails?.employer?.company_description && (
              <p className="mt-3 text-sm leading-6 text-foreground/80">
                {employerDetails.employer.company_description}
              </p>
            )}

            {(employerDetails?.employer?.company_website || employerDetails?.profile?.website) && (
              <a
                href={employerDetails?.employer?.company_website || employerDetails?.profile?.website || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
              >
                {lang === "my" ? "ဝဘ်ဆိုဒ်" : "Website →"}
              </a>
            )}
          </section>

          <MentorCoachCue
            variant={myApplication ? "interview" : "applied"}
            context={displayTitle}
          />
        </motion.div>
      </main>

      {/* Apply Modal — bottom sheet on mobile, centered dialog on desktop */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40 md:items-center md:bottom-0 md:p-6"
            onClick={() => setShowApplyModal(false)}
          >
            <motion.div
              initial={{ y: 400, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl md:max-h-[85vh] md:max-w-3xl md:rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5 md:px-6 md:py-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground md:text-lg">{lang === "my" ? "လျှောက်ထားရန်" : "Apply"} <span className="font-normal text-muted-foreground">— {displayTitle}</span></h2>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{job.company} · {translateJobLocation(job.location, lang)}</p>
                </div>
                <button onClick={() => setShowApplyModal(false)} className="-mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
                <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                  {/* Resume column */}
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "my" ? "Resume" : "Resume"}</h3>
                      </div>
                      {(selectedCvId || selectedGeneratedResumeId) && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={2} />
                      )}
                    </div>

                    {(cvDocuments.length > 0 || generatedResumes.length > 0) ? (
                      <div className="space-y-1.5">
                        {cvDocuments.slice(0, 1).map((doc: any) => {
                          const isSelected = selectedCvId === doc.id && !selectedGeneratedResumeId;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                                isSelected ? "border-emerald bg-emerald/5" : "border-border hover:bg-muted/50"
                              }`}
                              onClick={() => { setSelectedCvId(isSelected ? null : doc.id); setSelectedGeneratedResumeId(null); }}
                            >
                              <FileText className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-emerald" : "text-muted-foreground"}`} strokeWidth={1.5} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{doc.file_name}</p>
                                <p className="text-[10px] text-muted-foreground">{lang === "my" ? "မူရင်း CV" : "Original CV"} · {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : ""}</p>
                              </div>
                              {isSelected && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald" strokeWidth={2} />}
                            </button>
                          );
                        })}
                        {generatedResumes.map((doc: any) => {
                          const isSelected = selectedGeneratedResumeId === doc.id;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                                isSelected ? "border-emerald bg-emerald/5" : "border-border hover:bg-muted/50"
                              }`}
                              onClick={() => { setSelectedGeneratedResumeId(isSelected ? null : doc.id); setSelectedCvId(null); }}
                            >
                              <Sparkles className={`h-4 w-4 flex-shrink-0 text-emerald`} strokeWidth={1.5} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{doc.title}</p>
                                <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ဖန်တီးထား" : "Generated"} · {new Date(doc.created_at).toLocaleDateString()}</p>
                              </div>
                              {isSelected && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald" strokeWidth={2} />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center">
                        <p className="text-xs text-muted-foreground">{lang === "my" ? "CV မတင်ရသေးပါ" : "No resume yet"}</p>
                        <button onClick={() => navigate("/ai-tools")} className="mt-1.5 text-xs font-medium text-primary hover:underline">
                          {lang === "my" ? "Career Tools မှ CV တင်ရန် →" : "Upload one in Career Tools →"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (job?.id) params.set("jobId", job.id);
                        if (job?.title) params.set("jobTitle", job.title);
                        const companyName = (job as any)?.companies?.name || (job as any)?.company || "";
                        if (companyName) params.set("company", companyName);
                        params.set("returnTo", `/jobs/${id}?openApply=1`);
                        navigate(`/ai-tools/profile-builder?${params.toString()}`);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                      {lang === "my" ? "Resume အသစ် ဖန်တီးရန်" : "Generate new resume"}
                      {cvRewritePrice && <span className="text-gold-dark">· {cvRewritePrice.price_credits.toLocaleString()}c</span>}
                    </button>
                  </section>

                  {/* Cover letter column */}
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <PenLine className="h-3.5 w-3.5 text-emerald" strokeWidth={1.75} />
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "my" ? "အလုပ်လျှောက်လွှာ" : "Cover Letter"}</h3>
                        <span className="text-[10px] text-muted-foreground">({lang === "my" ? "ရွေးချယ်" : "optional"})</span>
                      </div>
                      {coverLetterMode !== "none" && coverLetter && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald" strokeWidth={2} />
                      )}
                    </div>

                    {generatedCoverLetters.length > 0 && (
                      <div className="mb-2 space-y-1.5">
                        {generatedCoverLetters.slice(0, 3).map((doc: any) => {
                          const isSelected = coverLetter === doc.content && coverLetterMode === "generated";
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                                isSelected ? "border-emerald bg-emerald/5" : "border-border hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                if (isSelected) { setCoverLetter(""); setCoverLetterMode("none"); }
                                else { setCoverLetter(doc.content); setCoverLetterMode("generated"); }
                              }}
                            >
                              <PenLine className="h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.5} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{doc.title}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setPreviewContent(doc.content); setPreviewTitle(doc.title); }} className="rounded p-1 text-muted-foreground hover:bg-muted">
                                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={generatingCoverLetter || (!selectedCvId && !selectedGeneratedResumeId)}
                        onClick={() => {
                          if (!selectedCvId && !selectedGeneratedResumeId) {
                            toast({
                              title: lang === "my" ? "Resume ရွေးပါ" : "Select a resume first",
                              variant: "destructive",
                            });
                            return;
                          }
                          setShowApplyModal(false);
                          setTimeout(() => setCoverLetterSpendOpen(true), 150);
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-2 text-[11px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                      >
                        {generatingCoverLetter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-emerald" strokeWidth={1.75} />}
                        <span>{lang === "my" ? "ဖန်တီးရန်" : "Generate"}</span>
                        {coverLetterPrice && <span className="text-gold-dark">· {coverLetterPrice.price_credits.toLocaleString()}c</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (coverLetterMode === "manual") { setCoverLetterMode("none"); setCoverLetter(""); }
                          else { setCoverLetterMode("manual"); }
                        }}
                        className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                          coverLetterMode === "manual" ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        <PenLine className="h-3 w-3" strokeWidth={1.75} />
                        {coverLetterMode === "manual" ? (lang === "my" ? "ပိတ်" : "Cancel") : (lang === "my" ? "ကိုယ်တိုင်" : "Write")}
                      </button>
                    </div>

                    {coverLetterMode === "manual" && (
                      <Textarea
                        value={coverLetter}
                        onChange={e => setCoverLetter(e.target.value)}
                        placeholder={lang === "my" ? "ဤအလုပ်အတွက် သင်ဘာကြောင့် သင့်တော်သည်ကို ရေးပါ..." : "Tell them why you're a great fit..."}
                        className="mt-2 min-h-[100px] rounded-lg border-border text-xs"
                      />
                    )}
                  </section>
                </div>

                {/* Priority toggle — full width */}
                <button
                  type="button"
                  onClick={() => setPriorityApply(v => !v)}
                  className={`mt-5 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${priorityApply ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <Sparkles className={`h-4 w-4 flex-shrink-0 ${priorityApply ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{lang === "my" ? "ဦးစားပေး လျှောက်လွှာ" : "Priority Application"}</p>
                      {priorityPrice && (
                        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-semibold text-gold-dark">
                          {priorityPrice.price_credits.toLocaleString()}c
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အလုပ်ရှင် စာရင်း၏ ထိပ်ဆုံးတွင် ပြသမည်" : "Pin to the top of the employer's list"}</p>
                  </div>
                  <div className={`h-4 w-7 flex-shrink-0 rounded-full transition-colors ${priorityApply ? "bg-primary" : "bg-muted"}`}>
                    <div className={`h-4 w-4 rounded-full bg-background shadow transition-transform ${priorityApply ? "translate-x-3" : ""}`} />
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t border-border bg-muted/20 px-5 py-3 md:px-6">
                {!selectedCvId && !selectedGeneratedResumeId ? (
                  <p className="flex-1 text-[11px] text-destructive">
                    {lang === "my" ? "လျှောက်ထားရန် Resume ရွေးပါ" : "Select a resume to apply"}
                  </p>
                ) : (
                  <p className="flex-1 text-[11px] text-muted-foreground">
                    {lang === "my" ? "ThweSat ပရိုဖိုင် + Resume" : "ThweSat profile + resume"}
                    {coverLetterMode !== "none" && coverLetter && (lang === "my" ? " + လျှောက်လွှာ" : " + cover letter")}
                  </p>
                )}
                <Button
                  variant="default"
                  className="rounded-xl"
                  onClick={handleApply}
                  disabled={applyMutation.isPending || (!selectedCvId && !selectedGeneratedResumeId)}
                >
                  {applyMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {lang === "my" ? "တင်နေသည်..." : "Submitting..."}
                    </span>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} /> {lang === "my" ? "လျှောက်လွှာ တင်ရန်" : "Submit Application"}
                    </>
                  )}
                </Button>
              </div>
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

      {/* Action bar — fixed bottom on mobile only (inline desktop version is rendered near the top) */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-lg md:hidden">
        <div className="mx-auto flex w-full max-w-md items-center gap-2">
          {actionButtons}
        </div>
      </div>
      <SpendConfirmSheet
        open={priorityConfirmOpen}
        onOpenChange={setPriorityConfirmOpen}
        actionKey="priority_application"
        targetType="job"
        targetId={id}
        idempotencyKey={`priority_application:${id}:${Date.now()}`}
        onSuccess={() => submitApplication()}
      />
      <SpendConfirmSheet
        open={coverLetterSpendOpen}
        onOpenChange={(o) => {
          setCoverLetterSpendOpen(o);
          if (!o) setShowApplyModal(true);
        }}
        actionKey="cover_letter"
        targetType="job"
        targetId={id}
        idempotencyKey={`cover_letter:${user?.id}:${id}:${Date.now()}`}
        onSuccess={() => {
          setShowApplyModal(true);
          runGenerateCoverLetter();
        }}
      />
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "my" ? "လျှောက်လွှာ တင်မည်လား?" : "Submit application?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  {lang === "my"
                    ? "ကျေးဇူးပြု၍ ကုန်ကျစရိတ်ကို စစ်ဆေးပါ။"
                    : "Please review the cost before submitting."}
                </p>
                <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">
                      {lang === "my" ? "လျှောက်လွှာ ပေးပို့ခ" : "Application submission"}
                    </span>
                    <span className="font-semibold text-emerald">
                      {lang === "my" ? "အခမဲ့" : "Free"}
                    </span>
                  </div>
                  {priorityApply && priorityPrice && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-foreground">
                        {lang === "my" ? "ဦးစားပေး လျှောက်လွှာ" : "Priority Application"}
                      </span>
                      <span className="font-semibold text-gold">
                        {priorityPrice.price_credits.toLocaleString()} credits
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                    <span>{lang === "my" ? "စုစုပေါင်း" : "Total"}</span>
                    <span className={priorityApply && priorityPrice ? "text-gold" : "text-emerald"}>
                      {priorityApply && priorityPrice
                        ? `${priorityPrice.price_credits.toLocaleString()} credits`
                        : lang === "my" ? "အခမဲ့" : "Free"}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {lang === "my" ? "မလုပ်တော့ပါ" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndSubmit} className="rounded-xl">
              {priorityApply && priorityPrice
                ? (lang === "my" ? "အတည်ပြု၍ ပေးချေမည်" : "Confirm & pay")
                : (lang === "my" ? "အတည်ပြု၍ တင်မည်" : "Confirm & submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobDetail;
