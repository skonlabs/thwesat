import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useCreateJob, useEmployerProfile } from "@/hooks/use-employer-data";
import PageHeader from "@/components/PageHeader";
import CategoryCombobox from "@/components/employer/CategoryCombobox";

const roleTypes = [
  { value: "remote_full", label: { my: "Remote အပြည့်", en: "Remote Full-Time" } },
  { value: "remote_contract", label: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" } },
  { value: "hybrid", label: { my: "Hybrid", en: "Hybrid" } },
  { value: "onsite", label: { my: "လူကိုယ်တိုင်", en: "On-site" } },
];

const paymentOptions = ["Payoneer", "Wise", "Bank Transfer", "Crypto"];
const applicationMethods = [
  { value: "platform", label: { my: "ThweSat မှ", en: "Via Platform" } },
  { value: "external", label: { my: "ပြင်ပလင့်ခ်", en: "External URL" } },
  { value: "email", label: { my: "အီးမေးလ်", en: "Via Email" } },
];

const EmployerPostJob = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const createJob = useCreateJob();
  const { data: employerProfile } = useEmployerProfile();
  const [step, setStep] = useState(1);
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [applicationMethod, setApplicationMethod] = useState("platform");
  const [externalUrl, setExternalUrl] = useState("");
  const isPro = employerProfile?.subscription_tier === "pro";

  const togglePayment = (p: string) => setSelectedPayments(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSubmit = async () => {
    const minVal = salaryMin ? Math.max(0, parseInt(salaryMin)) : null;
    const maxVal = salaryMax ? Math.max(0, parseInt(salaryMax)) : null;
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      toast({ title: lang === "my" ? "အနည်းဆုံးလစာသည် အများဆုံးထက် ကြီး၍မရပါ" : "Min salary cannot exceed max salary", variant: "destructive" });
      return;
    }
    try {
      await createJob.mutateAsync({
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
        application_method: applicationMethod,
        external_url: applicationMethod === "external" ? externalUrl : null,
        job_type: roleType.includes("contract") ? "contract" : "full-time",
        company: employerProfile?.company_name || "",
        status: "pending",
      });
      navigate("/employer/dashboard");
    } catch {
      toast({ title: lang === "my" ? "အမှားဖြစ်ပါသည်" : "Error submitting job", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာ တင်ရန်" : "Post a Job"} backPath="/employer/dashboard" />
      <div className="px-5">
        <div className="mb-5 flex items-center gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "အလုပ် အချက်အလက်" : "Job Details"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "my" ? "💡 ခေါင်းစဉ်နှင့် ဖော်ပြချက်ကို ရှင်းလင်းစွာ ရေးပါ — လျှောက်ထားသူ ပိုများလာပါမည်" : "💡 Clear titles and detailed descriptions attract more qualified applicants"}
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ခေါင်းစဉ် (English) *" : "Title (English) *"}</label>
              <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="e.g. Senior React Developer" className="h-11 rounded-xl" />
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
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လိုအပ်ချက် (မြန်မာ)" : "Requirements (Burmese)"}</label>
              <Textarea value={requirementsMy} onChange={e => setRequirementsMy(e.target.value)} className="min-h-[60px] rounded-xl" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အလုပ်အမျိုးအစား *" : "Role Type *"}</label>
              <div className="flex flex-wrap gap-2">
                {roleTypes.map(r => (
                  <button key={r.value} onClick={() => setRoleType(r.value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${roleType === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                    {lang === "my" ? r.label.my : r.label.en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အမျိုးအစား *" : "Category *"}</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="mx-auto w-full max-w-md pt-2">
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => setStep(2)} disabled={!titleEn || !descEn || !roleType || !category}>
                {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လစာ၊ ငွေပေးချေ + လုံခြုံရေး" : "Salary, Payment & Safety"}</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အနည်းဆုံး (USD)" : "Min Salary (USD)"}</label>
                <Input type="number" min="0" value={salaryMin} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) setSalaryMin(v); }} placeholder="1000" className="h-11 rounded-xl" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အများဆုံး (USD)" : "Max Salary (USD)"}</label>
                <Input type="number" min="0" value={salaryMax} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) setSalaryMax(v); }} placeholder="5000" className="h-11 rounded-xl" />
              </div>
            </div>
            {(roleType === "hybrid" || roleType === "onsite") && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "တိုင်းပြည်" : "Country"}</label>
                <Input value={locationCountry} onChange={e => setLocationCountry(e.target.value)} className="h-11 rounded-xl" />
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေပေးချေနည်းများ" : "Payment Methods"}</label>
              <div className="flex flex-wrap gap-2">
                {paymentOptions.map(p => (
                  <button key={p} onClick={() => togglePayment(p)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selectedPayments.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-foreground">{lang === "my" ? "ဒိုင်ယာစပိုရာ လုံခြုံရေး" : "Diaspora Safety Flags"}</h3>
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
            <div className={`rounded-xl border p-4 ${isPro ? "border-accent/30 bg-accent/5" : "border-border bg-muted/30"}`}>
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={isFeatured}
                  onCheckedChange={(v) => {
                    if (!isPro) {
                      setUpgradeOpen(true);
                      return;
                    }
                    setIsFeatured(!!v);
                  }}
                  className="mt-0.5"
                />
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                    {lang === "my" ? "ထူးခြား အလုပ်ခေါ်စာအဖြစ် ဖော်ပြရန်" : "Mark as Featured Job"}
                    {!isPro && (
                      <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">Pro</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {lang === "my" ? "ပင်မစာမျက်နှာတွင် ဦးစားပေး ဖော်ပြပါမည် (Pro အစီအစဉ် လိုအပ်သည်)" : "Highlighted on home screen (requires Pro plan)"}
                  </p>
                </div>
              </label>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "လျှောက်ထားနည်း" : "Application Method"}</label>
              <div className="space-y-2">
                {applicationMethods.map(m => (
                  <button key={m.value} onClick={() => setApplicationMethod(m.value)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${applicationMethod === m.value ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className={`h-4 w-4 rounded-full border-2 ${applicationMethod === m.value ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {applicationMethod === m.value && <div className="m-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-xs text-foreground">{lang === "my" ? m.label.my : m.label.en}</span>
                  </button>
                ))}
              </div>
            </div>
            {applicationMethod === "external" && (
              <Input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
            )}
            {requiresEmbassy && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" strokeWidth={1.5} />
                <p className="text-[11px] text-foreground/80">{lang === "my" ? "⚠️ သံရုံးနှင့် ဆက်သွယ်ရပါသဖြင့် သတိပေးခြင်း ပါဝင်ပါမည်" : "⚠️ Embassy contact warning will be displayed"}</p>
              </div>
            )}
            <div className="mx-auto flex w-full max-w-md gap-3 pt-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(1)}>{lang === "my" ? "နောက်သို့" : "Back"}</Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleSubmit} disabled={createJob.isPending}>
                {createJob.isPending ? (lang === "my" ? "တင်နေသည်..." : "Submitting...") : (lang === "my" ? "တင်ရန်" : "Submit")}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <Sheet open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <SheetContent side="bottom" className="bottom-16 mx-auto max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {lang === "my" ? "Pro အစီအစဉ် လိုအပ်သည်" : "Pro Plan Required"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              {lang === "my"
                ? "Featured အလုပ်ခေါ်စာများကို ပင်မစာမျက်နှာတွင် ဦးစားပေး ဖော်ပြသည်။ ဤအင်္ဂါရပ်ကို Pro အစီအစဉ်ဖြင့်သာ အသုံးပြုနိုင်ပါသည်။"
                : "Featured listings get priority placement on the home screen. Upgrade to Pro to enable it, then come back and post your job."}
            </p>
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-foreground">
              <p className="font-semibold">{lang === "my" ? "Pro ပါဝင်ပစ္စည်းများ" : "Pro includes"}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                <li>{lang === "my" ? "Featured အလုပ်ခေါ်စာ ဖော်ပြခြင်း" : "Featured job placement"}</li>
                <li>{lang === "my" ? "ပိုမို မြင်သာသော လူငှားရေး tools" : "Advanced hiring tools"}</li>
              </ul>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setUpgradeOpen(false)}>
                {lang === "my" ? "နောက်မှ" : "Not Now"}
              </Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => { setUpgradeOpen(false); navigate("/employer/subscription"); }}>
                {lang === "my" ? "Pro သို့ တိုးမြှင့်" : "Upgrade to Pro"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EmployerPostJob;
