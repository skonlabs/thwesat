import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-language";
import { useJob } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const roleTypes = [
  { value: "remote_full", label: { my: "Remote အပြည့်", en: "Remote Full-Time" } },
  { value: "remote_contract", label: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" } },
  { value: "hybrid", label: { my: "Hybrid", en: "Hybrid" } },
  { value: "onsite", label: { my: "လူကိုယ်တိုင်", en: "On-site" } },
];
const categories = ["tech", "design", "pm", "ngo", "translation", "finance", "education", "healthcare"];
const paymentOptions = ["Payoneer", "Wise", "Bank Transfer", "Crypto"];

const EmployerEditJob = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: job, isLoading } = useJob(id);
  const [saving, setSaving] = useState(false);
  
  const [titleEn, setTitleEn] = useState("");
  const [titleMy, setTitleMy] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descMy, setDescMy] = useState("");
  const [requirementsEn, setRequirementsEn] = useState("");
  const [requirementsMy, setRequirementsMy] = useState("");
  const [roleType, setRoleType] = useState("");
  const [category, setCategory] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [requiresEmbassy, setRequiresEmbassy] = useState(false);
  const [requiresWorkPermit, setRequiresWorkPermit] = useState(false);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (job) {
      setTitleEn(job.title || "");
      setTitleMy(job.title_my || "");
      setDescEn(job.description || "");
      setDescMy(job.description_my || "");
      setRequirementsEn(job.requirements || "");
      setRequirementsMy(job.requirements_my || "");
      setRoleType(job.role_type || "");
      setCategory(job.category || "");
      setSalaryMin(job.salary_min?.toString() || "");
      setSalaryMax(job.salary_max?.toString() || "");
      setLocationCountry(job.location || "");
      setSelectedPayments(job.payment_methods || []);
      setRequiresEmbassy(job.requires_embassy || false);
      setRequiresWorkPermit(job.requires_work_permit || false);
      setVisaSponsorship(job.visa_sponsorship || false);
      setIsFeatured(job.is_featured || false);
    }
  }, [job]);

  const togglePayment = (p: string) => setSelectedPayments(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const minVal = salaryMin ? Math.max(0, parseInt(salaryMin)) : null;
    const maxVal = salaryMax ? Math.max(0, parseInt(salaryMax)) : null;
    const { error } = await supabase.from("jobs").update({
      title: titleEn,
      title_my: titleMy || null,
      description: descEn,
      description_my: descMy || null,
      requirements: requirementsEn,
      requirements_my: requirementsMy || null,
      role_type: roleType,
      category,
      salary_min: minVal,
      salary_max: maxVal,
      location: locationCountry || "Remote",
      payment_methods: selectedPayments,
      requires_embassy: requiresEmbassy,
      requires_work_permit: requiresWorkPermit,
      visa_sponsorship: visaSponsorship,
      is_featured: isFeatured,
      job_type: roleType.includes("contract") ? "contract" : "full-time",
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(lang === "my" ? "ပြင်ဆင်၍ မရပါ" : "Failed to update");
    } else {
      toast.success(lang === "my" ? "အလုပ်ခေါ်စာ ပြင်ဆင်ပြီး" : "Job updated");
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      navigate("/employer/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "အလုပ် ပြင်ဆင်ရန်" : "Edit Job"} backPath="/employer/dashboard" />
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ် ပြင်ဆင်ရန်" : "Edit Job"} backPath="/employer/dashboard" />
      <div className="px-5 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ခေါင်းစဉ် (English) *" : "Title (English) *"}</label>
          <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ခေါင်းစဉ် (မြန်မာ)" : "Title (Burmese)"}</label>
          <Input value={titleMy} onChange={e => setTitleMy(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဖော်ပြချက် (English) *" : "Description (English) *"}</label>
          <Textarea value={descEn} onChange={e => setDescEn(e.target.value)} className="min-h-[100px] rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဖော်ပြချက် (မြန်မာ)" : "Description (Burmese)"}</label>
          <Textarea value={descMy} onChange={e => setDescMy(e.target.value)} className="min-h-[80px] rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လိုအပ်ချက် (English)" : "Requirements (English)"}</label>
          <Textarea value={requirementsEn} onChange={e => setRequirementsEn(e.target.value)} className="min-h-[80px] rounded-xl" />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အလုပ်အမျိုးအစား" : "Role Type"}</label>
          <div className="flex flex-wrap gap-2">
            {roleTypes.map(r => (
              <button key={r.value} onClick={() => setRoleType(r.value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${roleType === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {lang === "my" ? r.label.my : r.label.en}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အမျိုးအစား" : "Category"}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အနည်းဆုံး (USD)" : "Min Salary (USD)"}</label>
            <Input type="number" min="0" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အများဆုံး (USD)" : "Max Salary (USD)"}</label>
            <Input type="number" min="0" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "တိုင်းပြည်" : "Location"}</label>
          <Input value={locationCountry} onChange={e => setLocationCountry(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေပေးချေနည်းများ" : "Payment Methods"}</label>
          <div className="flex flex-wrap gap-2">
            {paymentOptions.map(p => (
              <button key={p} onClick={() => togglePayment(p)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selectedPayments.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{p}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <label className="flex items-start gap-3">
            <Checkbox checked={requiresEmbassy} onCheckedChange={v => setRequiresEmbassy(!!v)} className="mt-0.5" />
            <p className="text-xs text-foreground">{lang === "my" ? "သံရုံး စာရွက်စာတမ်း လိုအပ်" : "Requires Embassy Documents"}</p>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={requiresWorkPermit} onCheckedChange={v => setRequiresWorkPermit(!!v)} className="mt-0.5" />
            <p className="text-xs text-foreground">{lang === "my" ? "Work Permit လိုအပ်" : "Requires Work Permit"}</p>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={visaSponsorship} onCheckedChange={v => setVisaSponsorship(!!v)} className="mt-0.5" />
            <p className="text-xs text-foreground">{lang === "my" ? "ဗီဇာ ပံ့ပိုးပေး" : "Visa Sponsorship Available"}</p>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => navigate("/employer/dashboard")}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleSave} disabled={saving || !titleEn || !descEn}>
            {saving ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "သိမ်းရန်" : "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployerEditJob;
