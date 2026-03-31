import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, FileText, PenLine, TrendingUp, ChevronRight, Upload, Globe, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const aiFeatures = [
  {
    icon: FileText, title: "ပရိုဖိုင် တည်ဆောက်ရန်", titleEn: "AI Profile Builder",
    desc: "သင့်မြန်မာဘာသာ CV ကို နိုင်ငံတကာ အဆင့်မီ English Profile အဖြစ် ပြောင်းလဲပေးပါမည်",
    descEn: "Transform your Myanmar CV into a globally competitive English profile",
    status: "Ready", color: "bg-primary/10 text-primary"
  },
  {
    icon: PenLine, title: "Cover Letter ရေးသားရန်", titleEn: "AI Cover Letter Generator",
    desc: "အလုပ်တစ်ခုချင်းစီအတွက် စိတ်ကြိုက် cover letter ရေးသားပေးပါမည်",
    descEn: "Generate tailored cover letters for each job application",
    status: "Ready", color: "bg-emerald/10 text-emerald"
  },
  {
    icon: TrendingUp, title: "ကျွမ်းကျင်မှု ခွဲခြမ်းစိတ်ဖြာ", titleEn: "Skills Gap Analysis",
    desc: "သင်လိုချင်သော အလုပ်အတွက် မည်သည့် ကျွမ်းကျင်မှုများ လိုအပ်သေးသည်ကို ခွဲခြမ်းစိတ်ဖြာပေးပါမည်",
    descEn: "Identify skill gaps between your profile and target roles",
    status: "Premium", color: "bg-gold/10 text-gold-dark"
  },
];

const AiProfileBuilder = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI အကူအညီ</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Career Tools</p>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-foreground">ဘယ်လို အလုပ်လုပ်သလဲ? · How it works</h2>
            <div className="space-y-3">
              {[
                { step: "1", mm: "သင့် CV သို့မဟုတ် အတွေ့အကြုံကို မြန်မာဘာသာဖြင့် ထည့်သွင်းပါ", en: "Enter your experience in Burmese" },
                { step: "2", mm: "AI က နိုင်ငံတကာ အဆင့်မီ ပရိုဖိုင်အဖြစ် ပြောင်းလဲပေးမည်", en: "AI transforms it into a global-standard profile" },
                { step: "3", mm: "ပြင်ဆင်ပြီး Upwork, LinkedIn စသည်တို့တွင် အသုံးပြုပါ", en: "Edit and use on Upwork, LinkedIn, etc." },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.step}</span>
                  <div>
                    <p className="text-xs text-foreground/80">{s.mm}</p>
                    <p className="text-[10px] text-muted-foreground">{s.en}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Features */}
          <h2 className="mb-3 text-sm font-semibold text-foreground">AI Tools</h2>
          <div className="space-y-3">
            {aiFeatures.map((f, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card active:scale-[0.99]"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      f.status === "Premium" ? "bg-gold/10 text-gold-dark" : "bg-emerald/10 text-emerald"
                    }`}>{f.status}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{f.titleEn}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">{f.desc}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </motion.button>
            ))}
          </div>

          {/* Upload CV */}
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">CV တင်ရန် · Upload CV</h2>
            <button className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">CV ဖိုင်ကို ဤနေရာတွင် ထည့်ပါ</p>
              <p className="text-xs text-muted-foreground">PDF, DOCX · Max 10MB</p>
            </button>
          </div>

          {/* Supported platforms */}
          <div className="mt-5 rounded-xl bg-muted p-3">
            <p className="mb-2 text-xs font-medium text-foreground">ပံ့ပိုးသော Platform များ · Supported</p>
            <div className="flex flex-wrap gap-2">
              {["Upwork", "Fiverr", "LinkedIn", "Toptal", "Remote.co"].map((p) => (
                <span key={p} className="flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3" /> {p}
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
