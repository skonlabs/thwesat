import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Building2, Globe, DollarSign, Shield, Bookmark, Share2, CheckCircle, X, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { useJob, useSavedJobIds, useToggleSaveJob, useApplyToJob, useApplications } from "@/hooks/use-jobs";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data: job, isLoading } = useJob(id);
  const { data: savedJobIds = [] } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();
  const applyMutation = useApplyToJob();

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applied, setApplied] = useState(false);

  const saved = id ? savedJobIds.includes(id) : false;

  const handleApply = () => {
    if (!id) return;
    applyMutation.mutate({ jobId: id, coverLetter }, {
      onSuccess: () => {
        setApplied(true);
        setShowApplyModal(false);
        toast({
          title: lang === "my" ? "လျှောက်လွှာ တင်ပြီးပါပြီ ✓" : "Application submitted ✓",
          description: lang === "my" ? `${job?.company} မှ ပြန်ကြားပါမည်` : `${job?.company} will review your application`,
        });
      },
      onError: (error: any) => {
        toast({ title: lang === "my" ? "အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်" : "Something went wrong", description: error.message });
      },
    });
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

  return (
    <div className="min-h-screen bg-background pb-40">
      <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setShowApplyModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}</h2>
                <button onClick={() => setShowApplyModal(false)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{job.title} · {job.company}</p>
              <div className="mb-4 rounded-xl bg-emerald/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-emerald">{lang === "my" ? "ThweSone ပရိုဖိုင်ဖြင့် လျှောက်ထားမည်" : "Applying with your ThweSone profile"}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">{lang === "my" ? "Cover Letter (ရွေးချယ်ပိုင်ခွင့်)" : "Cover Letter (Optional)"}</label>
                <Textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder={lang === "my" ? "ဤအလုပ်အတွက် သင်ဘာကြောင့် သင့်တော်သည်ကို ရေးပါ..." : "Tell them why you're a great fit..."} className="min-h-[100px] rounded-xl border-border text-sm" />
              </div>
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={handleApply} disabled={applyMutation.isPending}>
                <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "လျှောက်လွှာ တင်ရန်" : "Submit Application"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={handleSave} className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${saved ? "border-accent bg-accent/10" : "border-border active:bg-muted"}`}>
            <Bookmark className={`h-5 w-5 ${saved ? "fill-accent text-accent" : "text-muted-foreground"}`} strokeWidth={1.5} />
          </button>
          <button onClick={handleShare} className="flex h-12 w-12 items-center justify-center rounded-xl border border-border active:bg-muted">
            <Share2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
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
