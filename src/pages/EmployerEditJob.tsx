import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Star, Info, Languages, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useJob } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { applicationMethodOptions, getApplicationMethodLabel, isValidUrl } from "@/lib/employer-labels";
import BilingualField from "@/components/employer/BilingualField";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import CategoryCombobox from "@/components/employer/CategoryCombobox";

const roleTypes = [
  { value: "remote_full", label: { my: "Remote အပြည့်", en: "Remote Full-Time" } },
  { value: "remote_contract", label: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" } },
  { value: "hybrid", label: { my: "Hybrid", en: "Hybrid" } },
  { value: "onsite", label: { my: "လူကိုယ်တိုင်", en: "On-site" } },
];

const paymentOptions = ["Payoneer", "Wise", "Bank Transfer", "Crypto"];

const EmployerEditJob = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: job, isLoading } = useJob(id);
  const { data: employerProfile } = useEmployerProfile();
  const isPro = employerProfile?.subscription_tier === "pro";
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showFeaturedInfo, setShowFeaturedInfo] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [requiresEmbassy, setRequiresEmbassy] = useState(false);
  const [requiresWorkPermit, setRequiresWorkPermit] = useState(false);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [wasFeatured, setWasFeatured] = useState(false);
  const [applicationMethod, setApplicationMethod] = useState("platform");
  const [externalUrl, setExternalUrl] = useState("");
  const [urlTouched, setUrlTouched] = useState(false);
  const [externalUrlError, setExternalUrlError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

const CHAR_LIMIT_DESC = 3000;
const CHAR_LIMIT_REQ = 2000;

  useEffect(() => {
    if (job) {
      setTitleEn(job.title || "");
      setTitleMy(job.title_my || "");
      setDescEn(job.description || "");
      setDescMy(job.description_my || "");
      setRequirementsEn(job.requirements || "");
      setRequirementsMy(job.requirements_my || "");
      setRoleType(job.role_type || "");
      const jobCategories = (job as any).categories as string[] | null | undefined;
      setCategories(jobCategories && jobCategories.length > 0 ? jobCategories : (job.category ? [job.category] : []));
      setSalaryMin(job.salary_min?.toString() || "");
      setSalaryMax(job.salary_max?.toString() || "");
      setLocationCountry(job.location || "");
      setSelectedPayments(job.payment_methods || []);
      setRequiresEmbassy(job.requires_embassy || false);
      setRequiresWorkPermit(job.requires_work_permit || false);
      setVisaSponsorship(job.visa_sponsorship || false);
      setIsFeatured(job.is_featured || false);
      setWasFeatured(job.is_featured || false);
      setApplicationMethod((job as any).application_method || "platform");
      setExternalUrl((job as any).external_url || "");
    }
  }, [job]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const markDirty = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => { setter(val); setIsDirty(true); }, []);

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

  const togglePayment = (p: string) => { setSelectedPayments(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); setIsDirty(true); };

  const externalUrlInvalid = applicationMethod === "external" && !isValidUrl(externalUrl);

  const handleOpenConfirm = () => {
    const minVal = salaryMin ? Math.max(0, parseInt(salaryMin)) : null;
    const maxVal = salaryMax ? Math.max(0, parseInt(salaryMax)) : null;
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      toast.error(lang === "my" ? "အနည်းဆုံးလစာသည် အများဆုံးထက် ကြီး၍မရပါ" : "Min salary cannot exceed max salary");
      return;
    }
    if (applicationMethod === "external" && !isValidUrl(externalUrl)) {
      setUrlTouched(true);
      toast.error(lang === "my" ? "လင့်ခ် မှန်ကန်အောင် ထည့်ပါ" : "Please enter a valid URL");
      return;
    }
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!id) return;
    const minVal = salaryMin ? Math.max(0, parseInt(salaryMin)) : null;
    const maxVal = salaryMax ? Math.max(0, parseInt(salaryMax)) : null;
    setSaving(true);

    // Issue #7: validate featured status against live subscription before saving
    let effectiveFeatured = isFeatured;
    if (isFeatured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: emp } = await supabase
          .from("employer_profiles")
          .select("subscription_tier, subscription_expires_at")
          .eq("id", user.id)
          .single();
        const isProActive =
          emp?.subscription_tier === "pro" &&
          (emp.subscription_expires_at == null ||
            emp.subscription_expires_at > new Date().toISOString());
        if (!isProActive) {
          effectiveFeatured = false;
          setIsFeatured(false);
          toast.warning("Your Pro plan has expired. This job will be saved without featured status.");
        }
      }
    }

    const { error } = await supabase.from("jobs").update({
      title: titleEn,
      title_my: titleMy || null,
      description: descEn,
      description_my: descMy || null,
      requirements: requirementsEn,
      requirements_my: requirementsMy || null,
      role_type: roleType,
      category: categories[0] || null,
      categories,
      salary_min: minVal,
      salary_max: maxVal,
      location: locationCountry || "Remote",
      payment_methods: selectedPayments,
      requires_embassy: requiresEmbassy,
      requires_work_permit: requiresWorkPermit,
      visa_sponsorship: visaSponsorship,
      is_featured: effectiveFeatured,
      application_method: applicationMethod,
      external_url: applicationMethod === "external" ? externalUrl.trim() : null,
      job_type: roleType.includes("contract") ? "contract" : "full-time",
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(lang === "my" ? "ပြင်ဆင်၍ မရပါ" : "Failed to update");
    } else {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-jobs"] });
      setConfirmOpen(false);
      navigate(-1);
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

  const methodPreview = getApplicationMethodLabel(applicationMethod, lang);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ် ပြင်ဆင်ရန်" : "Edit Job"} backPath="/employer/dashboard" />
      {(job as any)?.updated_at && (
        <div className="px-5 pb-0 pt-3">
          <p className="text-[11px] text-muted-foreground">
            {lang === "my" ? "နောက်ဆုံး ပြင်ဆင်ချိန်:" : "Last edited:"}{" "}
            {new Date((job as any).updated_at).toLocaleString()}
          </p>
        </div>
      )}
      {isDirty && (
        <div className="mx-5 mt-3 rounded-xl border border-yellow-400 bg-yellow-50 px-4 py-2.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          {lang === "my" ? "မသိမ်းရသေးသော ပြောင်းလဲမှုများ ရှိသည်" : "You have unsaved changes"}
        </div>
      )}
      <div className="px-5 space-y-4 mt-4">
        <BilingualField
          label={lang === "my" ? "ခေါင်းစဉ်" : "Title"}
          required
          enValue={titleEn}
          myValue={titleMy}
          onEnChange={markDirty(setTitleEn)}
          onMyChange={markDirty(setTitleMy)}
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
            onEnChange={markDirty(setDescEn)}
            onMyChange={markDirty(setDescMy)}
            lang={lang}
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{descEn.length}/{CHAR_LIMIT_DESC}</p>
        </div>
        <div>
          <BilingualField
            label={lang === "my" ? "လိုအပ်ချက်" : "Requirements"}
            multiline
            minHeight={80}
            enValue={requirementsEn}
            myValue={requirementsMy}
            onEnChange={markDirty(setRequirementsEn)}
            onMyChange={markDirty(setRequirementsMy)}
            lang={lang}
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{requirementsEn.length}/{CHAR_LIMIT_REQ}</p>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အလုပ်အမျိုးအစား" : "Role Type"}</label>
          <div className="flex flex-wrap gap-2">
            {roleTypes.map(r => (
              <button key={r.value} onClick={() => { setRoleType(r.value); setIsDirty(true); }} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${roleType === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {lang === "my" ? r.label.my : r.label.en}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "အမျိုးအစားများ" : "Categories"}</label>
          <CategoryCombobox values={categories} onChange={(v) => { setCategories(v); setIsDirty(true); }} />
          <p className="mt-1 text-[10px] text-muted-foreground">{lang === "my" ? "ရွေးချယ်ထားသည့် အမျိုးအစားများကို ဖယ်ရှားရန် ✕ ကို နှိပ်ပါ" : "Tap ✕ on a chip to remove a category."}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အနည်းဆုံး (USD)" : "Min Salary (USD)"}</label>
            <Input type="number" min="0" value={salaryMin} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) { setSalaryMin(v); setIsDirty(true); } }} className="h-11 rounded-xl" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အများဆုံး (USD)" : "Max Salary (USD)"}</label>
            <Input type="number" min="0" value={salaryMax} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) { setSalaryMax(v); setIsDirty(true); } }} className="h-11 rounded-xl" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "တိုင်းပြည်" : "Location"}</label>
          <Input value={locationCountry} onChange={e => { setLocationCountry(e.target.value); setIsDirty(true); }} className="h-11 rounded-xl" />
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
            <Checkbox checked={requiresEmbassy} onCheckedChange={v => { setRequiresEmbassy(!!v); setIsDirty(true); }} className="mt-0.5" />
            <p className="text-xs text-foreground">{lang === "my" ? "သံရုံး စာရွက်စာတမ်း လိုအပ်" : "Requires Embassy Documents"}</p>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={requiresWorkPermit} onCheckedChange={v => { setRequiresWorkPermit(!!v); setIsDirty(true); }} className="mt-0.5" />
            <p className="text-xs text-foreground">{lang === "my" ? "Work Permit လိုအပ်" : "Requires Work Permit"}</p>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={visaSponsorship} onCheckedChange={v => { setVisaSponsorship(!!v); setIsDirty(true); }} className="mt-0.5" />
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
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                  {lang === "my" ? "ထူးခြား အလုပ်ခေါ်စာအဖြစ် ဖော်ပြရန်" : "Mark as Featured Job"}
                  {!isPro && (
                    <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">Pro</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowFeaturedInfo(s => !s); }}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Featured info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {lang === "my" ? "ပင်မစာမျက်နှာတွင် ဦးစားပေး ဖော်ပြပါမည် (Pro အစီအစဉ် လိုအပ်သည်)" : "Highlighted on home screen (requires Pro plan)"}
              </p>
              {showFeaturedInfo && (
                <div className="mt-2 rounded-lg border border-accent/30 bg-background p-2.5 text-[11px] leading-relaxed text-foreground">
                  <p className="font-medium">{lang === "my" ? "Featured အကြောင်း" : "About Featured"}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                    <li>{lang === "my" ? "Pro အစီအစဉ်ရှိမှသာ Featured အဖြစ်ဖော်ပြနိုင်ပါမည်" : "Featured placement requires an active Pro plan."}</li>
                    <li>{lang === "my" ? "ပိတ်လိုက်ပါက အလုပ်ခေါ်စာသည် ပုံမှန်စာရင်းသို့ ပြန်ရောက်မည်" : "Turning Featured off moves the listing back to standard placement."}</li>
                    <li>{lang === "my" ? "လျှောက်ထားသူများနှင့် မက်ဆေ့ချ်များ ဆုံးရှုံးမည်မဟုတ်ပါ" : "No applicants or messages are lost when toggling."}</li>
                  </ul>
                </div>
              )}
              {wasFeatured && !isFeatured && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[10px] text-destructive">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{lang === "my" ? "ပိတ်ပြီးပါက ပင်မစာမျက်နှာတွင် မပြတော့ပါ" : "Turning Featured off will remove home-screen highlighting."}</span>
                </div>
              )}
            </div>
          </label>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "လျှောက်ထားနည်း" : "Application Method"}</label>
          <div className="space-y-2">
            {applicationMethodOptions.map(m => (
              <button key={m.value} onClick={() => setApplicationMethod(m.value)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${applicationMethod === m.value ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className={`h-4 w-4 rounded-full border-2 ${applicationMethod === m.value ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {applicationMethod === m.value && <div className="m-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                </div>
                <span className="text-xs text-foreground">{m.icon} {lang === "my" ? m.label.my : m.label.en}</span>
              </button>
            ))}
          </div>
          {applicationMethod === "external" && (
            <div className="mt-2">
              <Input
                value={externalUrl}
                onChange={e => { setExternalUrl(e.target.value); setIsDirty(true); if (externalUrlError) setExternalUrlError(""); }}
                onBlur={() => { setUrlTouched(true); handleUrlBlur(); }}
                placeholder="https://..."
                className={`h-11 rounded-xl ${(urlTouched && externalUrlInvalid) || externalUrlError ? "border-destructive" : ""}`}
              />
              {externalUrlError && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {externalUrlError}
                </p>
              )}
              {!externalUrlError && urlTouched && externalUrlInvalid && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {lang === "my" ? "မှန်ကန်သော လင့်ခ် (https://...) ထည့်ပါ" : "Enter a valid URL starting with http:// or https://"}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mx-auto flex w-full max-w-md gap-3 pt-2">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => navigate(-1)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleOpenConfirm} disabled={saving || !titleEn || !descEn}>
            {lang === "my" ? "သိမ်းရန်" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent side="bottom" className="bottom-16 mx-auto max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{lang === "my" ? "ပြောင်းလဲမှုများကို အတည်ပြုပါ" : "Confirm Changes"}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ" : "Listing"}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{titleEn || titleMy}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "ထူးခြား" : "Featured"}</p>
                <p className={`mt-0.5 flex items-center gap-1 text-sm font-medium ${isFeatured ? "text-accent-foreground" : "text-foreground"}`}>
                  <Star className={`h-3.5 w-3.5 ${isFeatured ? "fill-accent text-accent" : "text-muted-foreground"}`} strokeWidth={2} />
                  {isFeatured ? (lang === "my" ? "ဖွင့်" : "On") : (lang === "my" ? "ပိတ်" : "Off")}
                </p>
                {wasFeatured !== isFeatured && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {isFeatured ? (lang === "my" ? "ပင်မ၌ ဦးစားပေးဖော်ပြမည်" : "Will be highlighted on home") : (lang === "my" ? "ပင်မမှ ဖယ်ရှားမည်" : "Will lose home highlight")}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "လျှောက်နည်း" : "Application"}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{methodPreview.icon} {methodPreview.label}</p>
                {applicationMethod === "external" && externalUrl && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{externalUrl}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmOpen(false)} disabled={saving}>
                {lang === "my" ? "ပြန်ပြင်" : "Back"}
              </Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "အတည်ပြု" : "Confirm & Save")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
                : "Featured listings get priority placement on the home screen. This is a Pro-only feature — upgrade to enable it, then come back and finish editing your job."}
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

export default EmployerEditJob;
