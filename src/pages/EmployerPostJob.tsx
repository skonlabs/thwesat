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
import BilingualField from "@/components/employer/BilingualField";
import { useSpendCredits, useActionPrice, useWallet } from "@/hooks/use-wallet";
import { Coins } from "lucide-react";
import { SUPPORTED_JOB_PAYMENT_METHODS, sanitizeJobPaymentMethods } from "@/lib/payment-methods";
import { HQ_COUNTRIES } from "@/lib/countries";
import { X } from "lucide-react";

const CHAR_LIMIT_DESC = 3000;
const CHAR_LIMIT_REQ = 2000;
const MAX_SKILLS = 15;

const roleTypes = [
  { value: "remote_full", label: { my: "Remote အပြည့်", en: "Remote Full-Time" } },
  { value: "remote_contract", label: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" } },
  { value: "hybrid", label: { my: "Hybrid", en: "Hybrid" } },
  { value: "onsite", label: { my: "လူကိုယ်တိုင်", en: "On-site" } },
];

const paymentOptions = SUPPORTED_JOB_PAYMENT_METHODS;
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
  const [categories, setCategories] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("MMK");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [locationCountry, setLocationCountry] = useState("Myanmar");

  const [requiresEmbassy, setRequiresEmbassy] = useState(false);
  const [requiresWorkPermit, setRequiresWorkPermit] = useState(false);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [applicationMethod, setApplicationMethod] = useState("platform");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalUrlError, setExternalUrlError] = useState("");
  const [salaryMinError, setSalaryMinError] = useState("");
  const [salaryMaxError, setSalaryMaxError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contractDurationType, setContractDurationType] = useState<"fixed" | "variable">("fixed");
  const [contractDurationMonths, setContractDurationMonths] = useState("");
  const [contractDurationNote, setContractDurationNote] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s || skills.includes(s) || skills.length >= MAX_SKILLS) return;
    setSkills([...skills, s]);
    setSkillInput("");
  };
  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));
  const spend = useSpendCredits();
  const postPrice = useActionPrice("job_post");
  const featurePrice = useActionPrice("featured_job");
  const { data: wallet } = useWallet();
  const totalCost = (postPrice?.price_credits ?? 0) + (isFeatured ? featurePrice?.price_credits ?? 0 : 0);
  const balance = wallet?.balance_credits ?? 0;
  const insufficient = balance < totalCost;
  const isContract = roleType === "remote_contract";

  

  const handleUrlBlur = () => {
    if (!externalUrl) { setExternalUrlError(""); return; }
    try {
      const u = new URL(externalUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      setExternalUrlError("");
    } catch {
      setExternalUrlError("Enter a valid URL starting with http:// or https://");
    }
  };

  const handleSalaryMinChange = (v: string) => {
    if (v === "" || Number(v) >= 0) setSalaryMin(v);
    if (v !== "" && Number(v) < 1) {
      setSalaryMinError("Minimum salary must be at least 1");
    } else {
      setSalaryMinError("");
    }
    if (salaryMax && v && Number(v) > Number(salaryMax)) {
      setSalaryMaxError("Max salary must be greater than min salary");
    } else if (salaryMax) {
      setSalaryMaxError("");
    }
  };

  const handleSalaryMaxChange = (v: string) => {
    if (v === "" || Number(v) >= 0) setSalaryMax(v);
    if (salaryMin && v && Number(v) < Number(salaryMin)) {
      setSalaryMaxError("Max salary must be greater than min salary");
    } else {
      setSalaryMaxError("");
    }
  };

  const handleSubmit = async () => {
    const minVal = salaryNegotiable ? null : (salaryMin ? Math.max(0, parseInt(salaryMin)) : null);
    const maxVal = salaryNegotiable ? null : (salaryMax ? Math.max(0, parseInt(salaryMax)) : null);
    if (!salaryNegotiable && minVal !== null && maxVal !== null && minVal > maxVal) {
      toast({ title: lang === "my" ? "အနည်းဆုံးလစာသည် အများဆုံးထက် ကြီး၍မရပါ" : "Min salary cannot exceed max salary", variant: "destructive" });
      return;
    }
    if (insufficient) {
      toast({ title: lang === "my" ? "Credit မလုံလောက်ပါ" : "Insufficient credits", description: lang === "my" ? "ငွေဖြည့်ပါ" : "Top up your wallet first", variant: "destructive" });
      navigate("/wallet");
      return;
    }
    try {
      // Spend job_post first
      await spend.mutateAsync({ action_key: "job_post", idempotency_key: `job_post:${Date.now()}` });
      const { data: jobRow, error: jobErr } = await (await import("@/integrations/supabase/client")).supabase
        .from("jobs").insert({
        employer_id: (await (await import("@/integrations/supabase/client")).supabase.auth.getUser()).data.user?.id,
        title: titleEn, title_my: titleMy || null,
        description: descEn, description_my: descMy || null,
        requirements: requirementsEn, requirements_my: requirementsMy || null,
        role_type: roleType, category: categories[0] || null, categories,
        salary_min: minVal, salary_max: maxVal, currency, salary_negotiable: salaryNegotiable,
        location: locationCountry || "Remote",
        payment_methods: sanitizeJobPaymentMethods(selectedPayments),
        requires_embassy: requiresEmbassy, requires_work_permit: requiresWorkPermit,
        visa_sponsorship: visaSponsorship, is_featured: isFeatured,
        application_method: applicationMethod,
        external_url: applicationMethod === "external" ? externalUrl : null,
        job_type: roleType.includes("contract") ? "contract" : "full-time",
        contract_duration_type: isContract ? contractDurationType : null,
        contract_duration_months: isContract && contractDurationType === "fixed" && contractDurationMonths ? parseInt(contractDurationMonths) : null,
        contract_duration_note: isContract && contractDurationType === "variable" ? contractDurationNote : null,
        skills: skills.length ? skills : null,
        company: employerProfile?.company_name || "",
        status: "pending",
      } as any).select("id").single();
      if (jobErr) throw jobErr;
      if (isFeatured && jobRow?.id) {
        await spend.mutateAsync({ action_key: "featured_job", target_type: "job", target_id: jobRow.id });
      }
      navigate("/employer/dashboard");
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("insufficient_balance")) {
        toast({ title: lang === "my" ? "Credit မလုံလောက်ပါ" : "Insufficient credits", variant: "destructive" });
      } else {
        toast({ title: lang === "my" ? "အမှားဖြစ်ပါသည်" : "Error submitting job", description: msg, variant: "destructive" });
      }
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
            <BilingualField
              label={lang === "my" ? "ခေါင်းစဉ်" : "Title"}
              required
              enValue={titleEn}
              myValue={titleMy}
              onEnChange={setTitleEn}
              onMyChange={setTitleMy}
              lang={lang}
            />
            <div>
              <BilingualField
                label={lang === "my" ? "ဖော်ပြချက်" : "Description"}
                required
                multiline
                minHeight={100}
                enValue={descEn}
                myValue={descMy}
                onEnChange={setDescEn}
                onMyChange={setDescMy}
                lang={lang}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{descEn.length}/{CHAR_LIMIT_DESC}</p>
            </div>
            <div>
              <BilingualField
                label={lang === "my" ? "လိုအပ်ချက် *" : "Requirements *"}
                multiline
                minHeight={80}
                enValue={requirementsEn}
                myValue={requirementsMy}
                onEnChange={setRequirementsEn}
                onMyChange={setRequirementsMy}
                lang={lang}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{requirementsEn.length}/{CHAR_LIMIT_REQ}</p>
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
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အမျိုးအစားများ *" : "Categories *"}</label>
              <CategoryCombobox values={categories} onChange={setCategories} />
              <p className="mt-1 text-[10px] text-muted-foreground">{lang === "my" ? "အနည်းဆုံး တစ်ခု ရွေးပါ — အများဆုံး ၅ ခု" : "Pick at least one — up to 5 categories."}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</label>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{skills.length}/{MAX_SKILLS}</span>
              </div>
              {skills.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(skillInput); }
                  else if (e.key === "Backspace" && !skillInput && skills.length) removeSkill(skills[skills.length - 1]);
                }}
                onBlur={() => skillInput && addSkill(skillInput)}
                placeholder={lang === "my" ? "ဥပမာ: React, English — Enter ခလုတ် နှိပ်ပါ" : "e.g. React, English — press Enter"}
                className="h-11 rounded-xl"
                disabled={skills.length >= MAX_SKILLS}
              />
            </div>
            <div className="mx-auto w-full max-w-md pt-2">
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => setStep(2)} disabled={!titleEn || !descEn || !roleType || categories.length === 0}>
                {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လစာ၊ ငွေပေးချေ + လုံခြုံရေး" : "Salary, Payment & Safety"}</h2>
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="text-sm font-semibold text-foreground">
                {lang === "my" ? "လစာအကွာအဝေး (လစဉ်)" : "Salary Range (per month)"}
              </div>
              <div className="grid grid-cols-[5rem_1fr_1fr] items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေကြေး" : "Currency"}</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-2 text-sm text-foreground"
                  >
                    {["MMK", "USD", "SGD", "THB", "MYR", "JPY", "KRW", "AUD", "EUR", "GBP"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    {lang === "my" ? "အနည်းဆုံး" : "Min Salary"}{!salaryNegotiable && " *"}
                  </label>
                  <Input type="number" min="0" value={salaryMin} onChange={e => handleSalaryMinChange(e.target.value)} placeholder="1000" disabled={salaryNegotiable} className={`h-11 rounded-xl ${salaryMinError ? "border-destructive" : ""}`} />
                  {salaryMinError && !salaryNegotiable && <p className="mt-1 text-[11px] text-destructive">{salaryMinError}</p>}
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    {lang === "my" ? "အများဆုံး" : "Max Salary"}{!salaryNegotiable && " *"}
                  </label>
                  <Input type="number" min="0" value={salaryMax} onChange={e => handleSalaryMaxChange(e.target.value)} placeholder="5000" disabled={salaryNegotiable} className={`h-11 rounded-xl ${salaryMaxError ? "border-destructive" : ""}`} />
                  {salaryMaxError && !salaryNegotiable && <p className="mt-1 text-[11px] text-destructive">{salaryMaxError}</p>}
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1">
                <Checkbox checked={salaryNegotiable} onCheckedChange={v => setSalaryNegotiable(!!v)} />
                <span className="text-xs text-foreground">
                  {lang === "my" ? "လစာ ညှိနှိုင်းနိုင် / မဖော်ပြ" : "Negotiable / Not disclosed"}
                </span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {lang === "my" ? "တိုင်းပြည်" : "Country"}
                {(roleType === "hybrid" || roleType === "onsite") ? " *" : ""}
              </label>
              <select
                value={locationCountry}
                onChange={e => setLocationCountry(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">{lang === "my" ? "ရွေးချယ်ပါ" : "Select a country"}</option>
                {HQ_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(roleType === "remote_full" || roleType === "remote_contract") && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {lang === "my" ? "Remote ဖြစ်လျှင် ရွေးချယ်ရန် မလိုပါ" : "Optional for remote roles — helps timezone matching"}
                </p>
              )}
            </div>
            {isContract && (
              <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                <label className="block text-xs font-semibold text-foreground">{lang === "my" ? "ကန်ထရိုက် ကြာချိန်" : "Contract Duration"}</label>
                <div className="flex gap-2">
                  {(["fixed", "variable"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setContractDurationType(t)} className={`flex-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${contractDurationType === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                      {t === "fixed" ? (lang === "my" ? "သတ်မှတ်ထား" : "Fixed") : (lang === "my" ? "ပြောင်းလဲနိုင်" : "Variable")}
                    </button>
                  ))}
                </div>
                {contractDurationType === "fixed" ? (
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">{lang === "my" ? "လ အရေအတွက်" : "Months"}</label>
                    <Input type="number" min="1" value={contractDurationMonths} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 1) setContractDurationMonths(v); }} placeholder="6" className="h-11 rounded-xl" />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">{lang === "my" ? "မှတ်ချက် (ရွေးချယ်)" : "Note (optional)"}</label>
                    <Input value={contractDurationNote} onChange={e => setContractDurationNote(e.target.value)} placeholder={lang === "my" ? "ပရောဂျက်ပေါ် မူတည်" : "Depends on project scope"} className="h-11 rounded-xl" />
                  </div>
                )}
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
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={isFeatured}
                  onCheckedChange={(v) => setIsFeatured(!!v)}
                  className="mt-0.5"
                />
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                    {lang === "my" ? "Featured အဆင့်တင်" : "Mark as Featured"}
                    <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">+{(featurePrice?.price_credits ?? 0).toLocaleString()} credits</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {lang === "my" ? "7 ရက် ထိပ်ဆုံးတွင် ပြသမည်။" : "Pinned to top of search for 7 days."}
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
              <div>
                <Input
                  value={externalUrl}
                  onChange={e => { setExternalUrl(e.target.value); if (externalUrlError) setExternalUrlError(""); }}
                  onBlur={handleUrlBlur}
                  placeholder="https://..."
                  className={`h-11 rounded-xl ${externalUrlError ? "border-destructive" : ""}`}
                />
                {externalUrlError && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {externalUrlError}
                  </p>
                )}
              </div>
            )}
            {applicationMethod === "email" && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "လျှောက်လွှာများကို သင့်အကောင့် အီးမေးလ်ထံ ပို့ပေးပါမည်။"
                  : "Applications will be sent to your account email address."}
              </div>
            )}
            {requiresEmbassy && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" strokeWidth={1.5} />
                <p className="text-[11px] text-foreground/80">{lang === "my" ? "⚠️ သံရုံးနှင့် ဆက်သွယ်ရပါသဖြင့် သတိပေးခြင်း ပါဝင်ပါမည်" : "⚠️ Embassy contact warning will be displayed"}</p>
              </div>
            )}
            <div className="mx-auto flex w-full max-w-md flex-wrap gap-3 pt-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(1)}>{lang === "my" ? "နောက်သို့" : "Back"}</Button>
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setPreviewOpen(true)}>{lang === "my" ? "ကြိုကြည့်ရန်" : "Preview"}</Button>
              <Button variant="default" size="lg" className="w-full rounded-xl" onClick={handleSubmit} disabled={spend.isPending}>
                <Coins className="mr-1.5 h-4 w-4" />
                {spend.isPending ? (lang === "my" ? "တင်နေသည်..." : "Submitting...") : (lang === "my" ? `${totalCost.toLocaleString()} credits ပေး၍ တင်မည်` : `Post for ${totalCost.toLocaleString()} credits`)}
              </Button>
              {insufficient && (
                <p className="mt-2 w-full text-center text-[11px] text-destructive">
                  {lang === "my" ? `${(totalCost - balance).toLocaleString()} credits လို အပ်သည်။ ` : `Need ${(totalCost - balance).toLocaleString()} more credits. `}
                  <button type="button" className="underline" onClick={() => navigate("/wallet")}>{lang === "my" ? "ငွေဖြည့်မည်" : "Top up"}</button>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="bottom-16 mx-auto max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{lang === "my" ? "အလုပ်ခေါ်စာ ကြိုကြည့်ရှုမှု" : "Job Preview"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-base font-bold text-foreground">{titleEn || (lang === "my" ? "(ခေါင်းစဉ် မရှိ)" : "(No title)")}</h3>
            <p className="text-xs text-muted-foreground font-medium">{employerProfile?.company_name || ""}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {roleType && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{roleTypes.find(r => r.value === roleType)?.[lang === "my" ? "label" : "label"]?.[lang] || roleType}</span>}
              {salaryMin && salaryMax && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">${salaryMin}–${salaryMax}/mo</span>}
              {locationCountry && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{locationCountry}</span>}
            </div>
            {descEn && <p className="text-xs text-foreground/80 leading-relaxed">{descEn.slice(0, 150)}{descEn.length > 150 ? "…" : ""}</p>}
          </div>
        </SheetContent>
      </Sheet>
    
    </div>
  );
};

export default EmployerPostJob;
