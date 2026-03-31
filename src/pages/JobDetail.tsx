import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Briefcase, Building2, Globe, DollarSign, Shield, AlertTriangle, Bookmark, Share2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

const JobDetail = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>

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

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-lg pb-safe">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-border">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-border">
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </button>
          <Button variant="gold" size="lg" className="flex-1 rounded-xl">
            {lang === "my" ? "လျှောက်ထားရန်" : "Apply Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
