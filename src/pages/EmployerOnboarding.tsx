import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Globe, Upload, Users, Mail, Phone, CreditCard, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const industries = ["Technology", "NGO", "Manufacturing", "Finance", "Education", "Healthcare", "Hospitality", "Construction", "Agriculture", "Other"];
const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const paymentMethods = ["Payoneer", "Wise", "Bank Transfer", "Crypto"];

const EmployerOnboarding = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [companyNameMy, setCompanyNameMy] = useState("");
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

  const togglePayment = (m: string) => {
    setSelectedPayments(prev => prev.includes(m) ? prev.filter(p => p !== m) : [...prev, m]);
  };

  const handleSubmit = () => {
    toast({
      title: lang === "my" ? "အလုပ်ရှင် အကောင့် ဖန်တီးပြီးပါပြီ" : "Employer account created",
      description: lang === "my" ? "စစ်ဆေးအတည်ပြုဆဲ ဖြစ်ပါသည်" : "Pending verification by our team",
    });
    navigate("/employer/dashboard");
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "အလုပ်ရှင် စာရင်းသွင်းခြင်း" : "Employer Setup"} />
        <div className="flex flex-col items-center px-5 pt-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald/10">
            <CheckCircle className="h-10 w-10 text-emerald" strokeWidth={1.5} />
          </motion.div>
          <h1 className="mb-2 text-xl font-bold text-foreground">{lang === "my" ? "စာရင်းသွင်းပြီးပါပြီ!" : "Registration Complete!"}</h1>
          <p className="mb-2 text-sm text-muted-foreground">{lang === "my" ? "သင့်အလုပ်ရှင်အကောင့်ကို စစ်ဆေးအတည်ပြုဆဲ ဖြစ်ပါသည်" : "Your employer account is pending verification"}</p>
          <div className="mx-auto mb-6 max-w-xs rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-foreground/80">{lang === "my" ? "စစ်ဆေးနေစဉ် အလုပ်ခေါ်စာများ ပြင်ဆင်ထားနိုင်ပါသည်။ စစ်ဆေးပြီးပါက တိုက်ရိုက် ဖော်ပြပါမည်။" : "You can prepare job listings while we verify your company. They'll go live once verified."}</p>
          </div>
          <Button variant="gold" size="lg" className="w-full max-w-xs rounded-xl" onClick={handleSubmit}>
            {lang === "my" ? "Dashboard သို့ သွားရန်" : "Go to Dashboard"} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် စာရင်းသွင်းခြင်း" : "Employer Setup"} />
      <div className="px-5">
        {/* Progress */}
        <div className="mb-5 flex items-center gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "ကုမ္ပဏီ အချက်အလက်" : "Company Information"}</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအမည် *" : "Company Name *"}</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. TechCorp Asia" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအမည် (မြန်မာ)" : "Company Name (Burmese)"}</label>
              <Input value={companyNameMy} onChange={e => setCompanyNameMy(e.target.value)} placeholder="ရွေးချယ်ပိုင်ခွင့်" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဝဘ်ဆိုဒ် *" : "Website *"}</label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">LinkedIn</label>
              <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/..." className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီ ဖော်ပြချက်" : "Description"}</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[80px] rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "လုပ်ငန်းအမျိုးအစား" : "Industry"}</label>
              <div className="flex flex-wrap gap-2">
                {industries.map(i => (
                  <button key={i} onClick={() => setIndustry(i)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${industry === i ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီအရွယ်အစား" : "Company Size"}</label>
              <div className="flex flex-wrap gap-2">
                {companySizes.map(s => (
                  <button key={s} onClick={() => setCompanySize(s)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${companySize === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရုံးချုပ်တိုင်းပြည်" : "HQ Country"}</label>
              <Input value={hqCountry} onChange={e => setHqCountry(e.target.value)} placeholder="e.g. Singapore" className="h-11 rounded-xl" />
            </div>
            <Button variant="gold" size="lg" className="mt-2 w-full rounded-xl" onClick={() => setStep(2)} disabled={!companyName || !website}>
              {lang === "my" ? "ဆက်လက်ရန်" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် + ငွေပေးချေမှု" : "Contact & Payment"}</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အမည် *" : "Contact Name *"}</label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အီးမေးလ် *" : "Contact Email *"}</label>
              <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ဖုန်း" : "Phone"}</label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">{lang === "my" ? "ငွေပေးချေနည်းများ" : "Payment Methods Offered"}</label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map(m => (
                  <button key={m} onClick={() => togglePayment(m)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selectedPayments.includes(m) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(1)}>
                {lang === "my" ? "နောက်သို့" : "Back"}
              </Button>
              <Button variant="gold" size="lg" className="flex-1 rounded-xl" onClick={() => setStep(3)} disabled={!contactName || !contactEmail}>
                {lang === "my" ? "စာရင်းသွင်းရန်" : "Register"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmployerOnboarding;
