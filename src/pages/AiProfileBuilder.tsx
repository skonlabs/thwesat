import { motion } from "framer-motion";
import { Sparkles, FileText, PenLine, TrendingUp, ChevronRight, Upload, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const AiProfileBuilder = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const handleToolClick = (toolName: string, status: string) => {
    if (status === "Premium") {
      toast({
        title: lang === "my" ? "Premium လိုအပ်ပါသည်" : "Premium Required",
        description: lang === "my" ? "ဤအင်္ဂါရပ်ကို Premium အဆင့်မြှင့်ပြီး အသုံးပြုပါ" : "Upgrade to Premium to use this feature",
      });
      return;
    }
    toast({
      title: toolName,
      description: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon",
    });
  };

  const aiFeatures = [
    {
      icon: FileText,
      title: lang === "my" ? "ပရိုဖိုင် တည်ဆောက်ရန်" : "Profile Builder",
      desc: lang === "my" ? "သင့်မြန်မာဘာသာ CV ကို နိုင်ငံတကာ အဆင့်မီ English Profile အဖြစ် ပြောင်းလဲပေးပါမည်" : "Transform your Myanmar CV into a globally competitive English profile",
      status: "Ready",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-emerald/10",
      statusColor: "text-emerald",
    },
    {
      icon: PenLine,
      title: lang === "my" ? "Cover Letter ရေးသားရန်" : "Cover Letter Generator",
      desc: lang === "my" ? "အလုပ်တစ်ခုချင်းစီအတွက် စိတ်ကြိုက် cover letter ရေးသားပေးပါမည်" : "Generate tailored cover letters for each job application",
      status: "Ready",
      iconBg: "bg-emerald/10",
      iconColor: "text-emerald",
      statusBg: "bg-emerald/10",
      statusColor: "text-emerald",
    },
    {
      icon: TrendingUp,
      title: lang === "my" ? "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ" : "Skill Gap Analysis",
      desc: lang === "my" ? "သင်လိုချင်သော အလုပ်အတွက် မည်သည့် ကျွမ်းကျင်မှုများ လိုအပ်သေးသည်ကို ခွဲခြမ်းစိတ်ဖြာပေးပါမည်" : "Identify skill gaps between your profile and target roles",
      status: "Premium",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      statusBg: "bg-primary/10",
      statusColor: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Career Tools" : "Career Tools"} />
      <div className="px-5 pt-4">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Career Tools</h1>
              <p className="text-xs text-muted-foreground">
                {lang === "my" ? "သင့်အသက်မွေးဝမ်းကြောင်းအတွက် အကူအညီများ" : "Tools to boost your career"}
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-5 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဘယ်လို အလုပ်လုပ်သလဲ?" : "How it works"}</h2>
            <div className="space-y-3">
              {[
                { step: "1", text: lang === "my" ? "သင့် CV သို့မဟုတ် အတွေ့အကြုံကို မြန်မာဘာသာဖြင့် ထည့်သွင်းပါ" : "Enter your experience in Burmese or English" },
                { step: "2", text: lang === "my" ? "AI က နိုင်ငံတကာ အဆင့်မီ ပရိုဖိုင်အဖြစ် ပြောင်းလဲပေးမည်" : "We transform it into a global-standard profile" },
                { step: "3", text: lang === "my" ? "ပြင်ဆင်ပြီး Upwork, LinkedIn စသည်တို့တွင် အသုံးပြုပါ" : "Edit and use on Upwork, LinkedIn, etc." },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.step}</span>
                  <p className="text-xs text-foreground/80">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tool Cards */}
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ရရှိနိုင်သော Tools များ" : "Available Tools"}</h2>
          <div className="space-y-3">
            {aiFeatures.map((f, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleToolClick(f.title, f.status)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${f.iconBg}`}>
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.statusBg} ${f.statusColor}`}>{f.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </motion.button>
            ))}
          </div>

          {/* Upload CV */}
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "CV တင်ရန်" : "Upload CV"}</h2>
            <button className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-8 text-center active:bg-muted">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground">{lang === "my" ? "CV ဖိုင်ကို ဤနေရာတွင် ထည့်ပါ" : "Drop your CV file here"}</p>
              <p className="text-xs text-muted-foreground">PDF, DOCX · Max 10MB</p>
            </button>
          </div>

          {/* Supported Platforms */}
          <div className="mt-5 rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-foreground">{lang === "my" ? "ပံ့ပိုးသော Platform များ" : "Supported Platforms"}</p>
            <div className="flex flex-wrap gap-2">
              {["Upwork", "Fiverr", "LinkedIn", "Toptal", "Remote.co"].map((p) => (
                <span key={p} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3" strokeWidth={1.5} /> {p}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AiProfileBuilder;
