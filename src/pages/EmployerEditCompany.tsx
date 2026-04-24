import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile, useUpsertEmployerProfile } from "@/hooks/use-employer-data";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const industries = ["Technology", "NGO", "Manufacturing", "Finance", "Education", "Healthcare", "Hospitality", "Construction", "Agriculture", "Other"];
const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const paymentMethods = ["Payoneer", "Wise", "Bank Transfer", "Crypto"];

const EmployerEditCompany = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: profile, isLoading } = useEmployerProfile();
  const upsert = useUpsertEmployerProfile();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [hqCountry, setHqCountry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  // Issue #61: dirty state tracking
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setWebsite(profile.company_website || "");
      setLinkedin(profile.company_linkedin || "");
      setDescription(profile.company_description || "");
      setIndustry(profile.industry || "");
      setCompanySize(profile.company_size || "");
      setHqCountry(profile.hq_country || "");
      setContactName(profile.contact_name || "");
      setContactEmail(profile.contact_email || "");
      setContactPhone(profile.contact_phone || "");
      setSelectedPayments(profile.payment_methods || []);
      // Reset dirty when profile loads
      setIsDirty(false);
    }
  }, [profile]);

  // Attach beforeunload when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const markDirty = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => { setter(val); setIsDirty(true); }, []);

  const togglePayment = (m: string) => { setSelectedPayments(prev => prev.includes(m) ? prev.filter(p => p !== m) : [...prev, m]); setIsDirty(true); };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        company_name: companyName, company_website: website, company_linkedin: linkedin,
        company_description: description, industry, company_size: companySize, hq_country: hqCountry,
        contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone,
        payment_methods: selectedPayments,
      });
      setIsDirty(false);
      toast.success(lang === "my" ? "ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ပြီး" : "Company info updated");
      navigate("/employer/dashboard");
    } catch {
      toast.error(lang === "my" ? "အမှားဖြစ်ပါသည်" : "Error updating");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "ကုမ္ပဏီ ပြင်ဆင်ရန်" : "Edit Company"} backPath="/employer/dashboard" />
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကုမ္ပဏီ ပြင်ဆင်ရန်" : "Edit Company Info"} backPath="/employer/dashboard" />
      {isDirty && (
        <div className="mx-5 mt-3 rounded-xl border border-yellow-400 bg-yellow-50 px-4 py-2.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          {lang === "my" ? "မသိမ်းရသေးသော ပြောင်းလဲမှုများ ရှိသည်" : "You have unsaved changes"}
        </div>
      )}
      <div className="px-5 space-y-4 mt-4">
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအမည် *" : "Company Name *"}</label><Input value={companyName} onChange={e => markDirty(setCompanyName)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဝဘ်ဆိုဒ်" : "Website"}</label><Input value={website} onChange={e => markDirty(setWebsite)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">LinkedIn</label><Input value={linkedin} onChange={e => markDirty(setLinkedin)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီ ဖော်ပြချက်" : "Description"}</label><Textarea value={description} onChange={e => markDirty(setDescription)(e.target.value)} className="min-h-[80px] rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လုပ်ငန်းအမျိုးအစား" : "Industry"}</label>
          <div className="flex flex-wrap gap-2">{industries.map(i => (<button key={i} onClick={() => markDirty(setIndustry)(i)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${industry === i ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i}</button>))}</div>
        </div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအရွယ်အစား" : "Company Size"}</label>
          <div className="flex flex-wrap gap-2">{companySizes.map(s => (<button key={s} onClick={() => markDirty(setCompanySize)(s)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${companySize === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{s}</button>))}</div>
        </div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရုံးချုပ်တိုင်းပြည်" : "HQ Country"}</label><Input value={hqCountry} onChange={e => markDirty(setHqCountry)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အမည်" : "Contact Name"}</label><Input value={contactName} onChange={e => markDirty(setContactName)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အီးမေးလ်" : "Contact Email"}</label><Input type="email" value={contactEmail} onChange={e => markDirty(setContactEmail)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဖုန်း" : "Phone"}</label><Input value={contactPhone} onChange={e => markDirty(setContactPhone)(e.target.value)} className="h-11 rounded-xl" /></div>
        <div><label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေပေးချေနည်းများ" : "Payment Methods"}</label>
          <div className="flex flex-wrap gap-2">{paymentMethods.map(m => (<button key={m} onClick={() => togglePayment(m)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selectedPayments.includes(m) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{m}</button>))}</div>
        </div>
        <div className="mx-auto flex w-full max-w-md gap-3 pt-2">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => navigate("/employer/dashboard")}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
          <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleSave} disabled={upsert.isPending || !companyName}>
            {upsert.isPending ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "သိမ်းရန်" : "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployerEditCompany;
