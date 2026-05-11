import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Briefcase, Building2, Sparkles, Users, ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useUpsertEmployerProfile } from "@/hooks/use-employer-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { SUPPORTED_JOB_PAYMENT_METHODS, sanitizeJobPaymentMethods, getPlatformPaymentMethodLabel } from "@/lib/payment-methods";
import { PaymentMethodChip } from "@/components/payment/PaymentMethodIcon";
import { HQ_COUNTRIES } from "@/lib/countries";

const industries = ["Technology", "NGO", "Manufacturing", "Finance", "Education", "Healthcare", "Hospitality", "Hotel & Resort", "Restaurant & F&B", "Retail", "Pharmacy", "Logistics & Warehousing", "Import/Export", "Construction", "Agriculture", "Garment & Textile", "Domestic & Caregiving", "Cleaning & Facilities", "Security Services", "Transportation & Driving", "Beauty & Wellness", "Automotive", "Other"];
const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const paymentMethods = SUPPORTED_JOB_PAYMENT_METHODS;

const EmployerOnboarding = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const upsert = useUpsertEmployerProfile();
  const { profile } = useAuth();
  const isAgent = profile?.primary_role === "agent";
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [description, setDescription] = useState("");
  const [whatWeDo, setWhatWeDo] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [benefitsInput, setBenefitsInput] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [fullAddress, setFullAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [hqCountry, setHqCountry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [companyNameWarning, setCompanyNameWarning] = useState("");

  const togglePayment = (m: string) => setSelectedPayments(prev => prev.includes(m) ? prev.filter(p => p !== m) : [...prev, m]);

  const handleCompanyNameBlur = async () => {
    if (!companyName.trim()) return;
    const { data } = await supabase
      .from("employer_profiles")
      .select("id")
      .ilike("company_name", companyName)
      .maybeSingle();
    if (data) {
      setCompanyNameWarning(lang === "my" ? "ဤအမည်ဖြင့် ကုမ္ပဏီတစ်ခု ရှိပြီးသားဖြစ်ပါသည်" : "A company with this name already exists.");
    } else {
      setCompanyNameWarning("");
    }
  };

  const handleSubmit = async () => {
    // Issue #18: server-side uniqueness check to prevent race condition
    const { data: existing } = await supabase
      .from("employer_profiles")
      .select("id")
      .ilike("company_name", companyName.trim())
      .maybeSingle();
    if (existing) {
      toast({
        title: lang === "my" ? "ကုမ္ပဏီအမည် ထပ်နေသည်" : "Company name already taken",
        description: lang === "my"
          ? "ဤအမည်ဖြင့် ကုမ္ပဏီတစ်ခု ရှိပြီးသားဖြစ်ပါသည်"
          : "A company with this name already exists. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        company_name: companyName, company_website: website, company_linkedin: linkedin,
        company_description: description, what_we_do: whatWeDo, mission, vision, benefits,
        full_address: fullAddress,
        industry, company_size: companySize, hq_country: hqCountry,
        contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone,
        payment_methods: sanitizeJobPaymentMethods(selectedPayments),
      });
      navigate("/dashboard");
    } catch {
      toast({ title: lang === "my" ? "အမှားဖြစ်ပါသည်" : "Error", variant: "destructive" });
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "စာရင်းသွင်းခြင်း" : "Account Setup"} showBack />
        <div className="flex flex-col items-center px-5 pt-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </motion.div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "စာရင်းသွင်းပြီးပါပြီ!" : "Registration Complete!"}</h1>
          <p className="mb-2 text-sm text-muted-foreground">{lang === "my" ? "စစ်ဆေးအတည်ပြုဆဲ ဖြစ်ပါသည်" : "Pending verification"}</p>
          <p className="mb-6 text-xs text-muted-foreground rounded-xl border border-border bg-muted/50 px-4 py-3">
            {lang === "my"
              ? "သင့် အကောင့်ကို စစ်ဆေးနေဆဲ ဖြစ်ပါသည်။ ၂ ရက်အတွင်း အကြောင်းကြားပါမည်။"
              : "Your account is pending verification. You will be notified within 2 business days."}
          </p>
            <Button variant="default" size="lg" className="w-full max-w-xs rounded-xl" onClick={handleSubmit} disabled={upsert.isPending}>
            {lang === "my" ? "Dashboard သို့ သွားရန်" : "Go to Dashboard"} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 0) {
    const valueProps = [
      { icon: Users, en: "Reach vetted talent across APAC", my: "APAC တစ်ဝှမ်းမှ စစ်ဆေးပြီးသား ကျွမ်းကျင်သူများ ရှာဖွေနိုင်" },
      { icon: ShieldCheck, en: "Verified employers stand out", my: "အတည်ပြုထား အလုပ်ရှင်များက ပိုထင်ရှား" },
      { icon: Zap, en: "Post a job in under 5 minutes", my: "၅ မိနစ်အတွင်း အလုပ်ခေါ်ယူနိုင်" },
    ];
    return (
      <div className="landing-dark relative min-h-screen overflow-hidden bg-shell text-shell-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[24rem] w-[24rem] rounded-full bg-sidebar-accent/70 blur-[100px]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-6 md:max-w-lg md:px-8">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-sm text-shell-foreground/60 hover:text-shell-foreground">
              ← {lang === "my" ? "နောက်သို့" : "Back"}
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center py-10">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="mb-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_12px_40px_-12px_hsl(var(--accent)/0.6)]">
                <Building2 className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-accent">
                {isAgent
                  ? (lang === "my" ? "အေဂျင့်များအတွက်" : "FOR AGENCIES")
                  : (lang === "my" ? "အလုပ်ရှင်များအတွက်" : "FOR EMPLOYERS")}
              </p>
              <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-[2.5rem]">
                {lang === "my" ? "သင့်နောက်ထပ် ထူးချွန်သူကို ဤနေရာတွင် ရှာတွေ့ပါ။" : "Find your next great hire — fast."}
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-shell-foreground/75">
                {lang === "my"
                  ? "ကုမ္ပဏီပရိုဖိုင်တစ်ခု တည်ဆောက်ပြီး APAC တစ်ဝှမ်းမှ အရည်အချင်းပြည့်စုံသူများကို ချိတ်ဆက်ပါ။"
                  : "Set up your company profile and connect with qualified candidates across APAC."}
              </p>

              <ul className="mt-8 space-y-3">
                {valueProps.map((v) => (
                  <li key={v.en} className="flex items-start gap-3 text-sm text-shell-foreground/85">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-accent">
                      <v.icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    {lang === "my" ? v.my : v.en}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <div className="pb-10">
            <Button size="xl" onClick={() => setStep(1)} className="group h-14 w-full rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90">
              <span className="text-base font-semibold">{lang === "my" ? "စတင်ရန်" : "Get started"}</span>
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Button>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-shell-foreground/60">
              <Sparkles className="h-3 w-3 text-accent" strokeWidth={2} />
              <span>{lang === "my" ? "၂ ဆင့်သာ · ၅ မိနစ်" : "Just 2 steps · 5 minutes"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "စာရင်းသွင်းခြင်း" : "Account Setup"} showBack />
      <div className="px-5">
        <div className="mb-5 flex items-center gap-2">
          {[1, 2].map(s => (<div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />))}
        </div>
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{isAgent ? (lang === "my" ? "အေဂျင့် / ကုမ္ပဏီ အချက်အလက်" : "Agency / Company Information") : (lang === "my" ? "ကုမ္ပဏီ အချက်အလက်" : "Company Information")}</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအမည် *" : "Company Name *"}</label>
              <Input value={companyName} onChange={e => { setCompanyName(e.target.value); setCompanyNameWarning(""); }} onBlur={handleCompanyNameBlur} className="h-11 rounded-xl" />
              {companyNameWarning && <p className="mt-1 text-[11px] text-yellow-600 dark:text-yellow-400">{companyNameWarning}</p>}
            </div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဝဘ်ဆိုဒ် *" : "Website *"}</label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="h-11 rounded-xl" /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">LinkedIn</label><Input value={linkedin} onChange={e => setLinkedin(e.target.value)} className="h-11 rounded-xl" /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီ ဖော်ပြချက် (အကျဉ်း)" : "Short Description"}</label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[80px] rounded-xl" placeholder={lang === "my" ? "တစ်ကြောင်း သို့မဟုတ် နှစ်ကြောင်း" : "One or two lines"} /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကျွန်ုပ်တို့ဘာလုပ်သလဲ" : "What We Do"}</label><Textarea value={whatWeDo} onChange={e => setWhatWeDo(e.target.value)} className="min-h-[100px] rounded-xl" placeholder={lang === "my" ? "လုပ်ငန်းအသေးစိတ်" : "Describe what your company does in detail"} /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရည်မှန်းချက် (Mission)" : "Mission"}</label><Textarea value={mission} onChange={e => setMission(e.target.value)} className="min-h-[80px] rounded-xl" placeholder={lang === "my" ? "ကုမ္ပဏီ၏ ရည်မှန်းချက်" : "What drives your company"} /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "မျှော်မှန်းချက် (Vision)" : "Vision"}</label><Textarea value={vision} onChange={e => setVision(e.target.value)} className="min-h-[80px] rounded-xl" placeholder={lang === "my" ? "ကုမ္ပဏီ၏ မျှော်မှန်းချက်" : "Where you see your company in the future"} /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဝန်ထမ်း အကျိုးခံစားခွင့်" : "Employee Benefits"}</label>
              <div className="flex gap-2">
                <Input value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const v = benefitsInput.trim(); if (v && !benefits.includes(v)) setBenefits([...benefits, v]); setBenefitsInput(""); } }} placeholder={lang === "my" ? "ဥပမာ — ကျန်းမာရေးအာမခံ" : "e.g. Health insurance"} className="h-11 rounded-xl" />
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => { const v = benefitsInput.trim(); if (v && !benefits.includes(v)) setBenefits([...benefits, v]); setBenefitsInput(""); }}>{lang === "my" ? "ထည့်ရန်" : "Add"}</Button>
              </div>
              {benefits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {benefits.map(b => (
                    <span key={b} className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-medium text-emerald">
                      ✓ {b}
                      <button type="button" onClick={() => setBenefits(benefits.filter(x => x !== b))} className="ml-1 text-emerald/70 hover:text-emerald">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လုပ်ငန်းအမျိုးအစား" : "Industry"}</label>
              <div className="flex flex-wrap gap-2">{industries.map(i => (<button key={i} onClick={() => setIndustry(i)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${industry === i ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i}</button>))}</div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအရွယ်အစား" : "Company Size"}</label>
              <div className="flex flex-wrap gap-2">{companySizes.map(s => (<button key={s} onClick={() => setCompanySize(s)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${companySize === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{s}</button>))}</div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရုံးချုပ်တိုင်းပြည်" : "HQ Country"}</label>
              <select value={hqCountry} onChange={e => setHqCountry(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option value="">{lang === "my" ? "ရွေးချယ်ပါ" : "Select country"}</option>
                {HQ_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button variant="default" size="lg" className="mt-2 w-full rounded-xl" onClick={() => setStep(2)} disabled={!companyName || !website}>
              {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် + ငွေပေးချေမှု" : "Contact & Payment"}</h2>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အမည်" : "Contact Name"}</label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="h-11 rounded-xl" placeholder={lang === "my" ? "သင့်အမည်" : "Your name"} /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အီးမေးလ်" : "Contact Email"}</label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-11 rounded-xl" /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဖုန်း" : "Phone"}</label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-11 rounded-xl" /></div>
            <div><label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လိပ်စာ အပြည့်အစုံ" : "Full Address"}</label><Textarea value={fullAddress} onChange={e => setFullAddress(e.target.value)} className="min-h-[60px] rounded-xl" placeholder={lang === "my" ? "လမ်း၊ မြို့၊ ပြည်နယ်" : "Street, city, state, postal code"} /></div>
            {isAgent && (
              <div><label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေပေးချေနည်းများ *" : "Payment Methods *"}</label>
                <div className="flex flex-wrap gap-2">{paymentMethods.map(m => (
                  <PaymentMethodChip key={m} method={m} selected={selectedPayments.includes(m)} onClick={() => togglePayment(m)} />
                ))}</div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{lang === "my" ? "ခန့်ထားခ ပေးချေနိုင်သော နည်းလမ်းများကို ရွေးပါ" : "Select the methods you can use to pay placement fees"}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(1)}>{lang === "my" ? "နောက်သို့" : "Back"}</Button>
              <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(3)} disabled={isAgent && selectedPayments.length === 0}>{lang === "my" ? "စာရင်းသွင်းရန်" : "Register"}</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmployerOnboarding;
