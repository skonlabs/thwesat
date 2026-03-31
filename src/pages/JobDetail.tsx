import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Briefcase, Building2, Globe, DollarSign, Shield, AlertTriangle, Bookmark, Share2, CheckCircle, X, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const JobDetail = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    setApplied(true);
    setShowApplyModal(false);
    toast({
      title: lang === "my" ? "လျှောက်လွှာ တင်ပြီးပါပြီ ✓" : "Application submitted ✓",
      description: lang === "my" ? "TechCorp Asia မှ ပြန်ကြားပါမည်" : "TechCorp Asia will review your application",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Senior React Developer - TechCorp Asia", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ် အသေးစိတ်" : "Job Detail"} showBack />
      <div className="px-6">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Senior React Developer</h1>
              <p className="text-sm text-muted-foreground">TechCorp Asia</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-medium text-emerald">
                  <CheckCircle className="h-3 w-3" /> {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {lang === "my" ? "2 နာရီအကြာ" : "2 hours ago"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: lang === "my" ? "လစာ" : "Salary", value: "$3,000 - $5,000/mo" },
              { icon: MapPin, label: lang === "my" ? "တည်နေရာ" : "Location", value: "Remote" },
              { icon: Clock, label: lang === "my" ? "အမျိုးအစား" : "Type", value: "Full-time" },
              { icon: Globe, label: lang === "my" ? "ငွေပေးချေမှု" : "Payment", value: "Wise, Payoneer" },
            ].map((info) => (
              <div key={info.label} className="rounded-xl bg-card p-3 shadow-card">
                <info.icon className="mb-1 h-4 w-4 text-primary" />
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
                <p className="text-xs font-semibold text-foreground">{info.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald/5 p-3.5">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" />
            <div>
              <p className="text-xs font-semibold text-emerald">Diaspora Safe</p>
              <p className="text-[11px] text-muted-foreground">
                {lang === "my" ? "သံရုံးစာရွက်စာတမ်း မလိုအပ်ပါ" : "No embassy documentation required"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "အလုပ်အကြောင်း" : "Description"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {lang === "my"
                ? "ကျွန်ုပ်တို့သည် အတွေ့အကြုံရှိသော React Developer တစ်ဦးကို အရှေ့တောင်အာရှ ဈေးကွက်များအတွက် နောက်မျိုးဆက် fintech solutions တည်ဆောက်ရန် ရှာဖွေနေပါသည်။"
                : "We're looking for an experienced React developer to join our distributed team building next-generation fintech solutions for Southeast Asian markets."}
            </p>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "လိုအပ်ချက်များ" : "Requirements"}</h2>
            <ul className="space-y-2">
              {[
                { my: "React/TypeScript အတွေ့အကြုံ ၃ နှစ်+", en: "3+ years React/TypeScript experience" },
                { my: "REST APIs နှင့် GraphQL အတွေ့အကြုံ", en: "Experience with REST APIs and GraphQL" },
                { my: "ပြဿနာဖြေရှင်းနိုင်စွမ်း", en: "Strong problem-solving skills" },
                { my: "English ရေးသားနိုင်စွမ်း", en: "Good English communication (written)" },
                { my: "Remote work အတွေ့အကြုံ ဦးစားပေး", en: "Remote work experience preferred" },
              ].map((req) => (
                <li key={req.en} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  {lang === "my" ? req.my : req.en}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
            <div className="flex flex-wrap gap-2">
              {["React", "TypeScript", "Node.js", "GraphQL", "Tailwind CSS", "Git"].map((s) => (
                <span key={s} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">TechCorp Asia</h3>
                <p className="text-xs text-muted-foreground">Singapore · Fintech · 50-200 employees</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            👥 {lang === "my" ? "လျှောက်ထားသူ 23 ဦး" : "23 applicants"}
          </p>
        </motion.div>
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowApplyModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}</h2>
                <button onClick={() => setShowApplyModal(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Senior React Developer · TechCorp Asia</p>

              <div className="mb-4 rounded-xl bg-emerald/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald" />
                  <p className="text-xs font-medium text-emerald">{lang === "my" ? "ThweSone ပရိုဖိုင်ဖြင့် လျှောက်ထားမည်" : "Applying with your ThweSone profile"}</p>
                </div>
                <p className="ml-6 mt-1 text-[11px] text-muted-foreground">{lang === "my" ? "Maung Maung · Full Stack Developer" : "Maung Maung · Full Stack Developer"}</p>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">{lang === "my" ? "Cover Letter (ရွေးချယ်ပိုင်ခွင့်)" : "Cover Letter (Optional)"}</label>
                <Textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder={lang === "my" ? "ဤအလုပ်အတွက် သင်ဘာကြောင့် သင့်တော်သည်ကို ရေးပါ..." : "Tell them why you're a great fit for this role..."} className="min-h-[100px] rounded-xl border-border text-sm" />
              </div>

              <Button variant="gold" size="lg" className="w-full rounded-xl" onClick={handleApply}>
                <Send className="mr-1.5 h-4 w-4" /> {lang === "my" ? "လျှောက်လွှာ တင်ရန်" : "Submit Application"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-lg pb-safe">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => setSaved(!saved)} className={`flex h-12 w-12 items-center justify-center rounded-xl border ${saved ? "border-primary bg-primary/5" : "border-border"}`}>
            <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
          <button onClick={handleShare} className="flex h-12 w-12 items-center justify-center rounded-xl border border-border">
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </button>
          {applied ? (
            <Button variant="outline" size="lg" className="flex-1 rounded-xl text-emerald border-emerald" disabled>
              <CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "လျှောက်ထားပြီး" : "Applied"}
            </Button>
          ) : (
            <Button variant="gold" size="lg" className="flex-1 rounded-xl" onClick={() => setShowApplyModal(true)}>
              {lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
