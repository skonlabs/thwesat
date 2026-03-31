import { ArrowLeft, Shield, AlertTriangle, Clock, CheckCircle, BookOpen, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const GuideDetail = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            ဗီဇာ · Visa · 🇹🇭 Thailand
          </span>
          <h1 className="mb-2 text-xl font-bold leading-tight text-foreground">
            ထိုင်း Pink Card လျှောက်ထားနည်း
          </h1>
          <p className="mb-3 text-sm text-muted-foreground">Thai Pink Card Application Guide</p>

          {/* Meta */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[10px] font-medium text-emerald">
              <CheckCircle className="h-3 w-3" /> Verified by MAP Foundation, Chiang Mai
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" /> 10 min read
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              📅 Updated Mar 2026
            </span>
          </div>

          {/* Warning banner */}
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-destructive/5 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div>
              <p className="text-xs font-semibold text-destructive">⚠️ သတိပေးချက်</p>
              <p className="mt-0.5 text-[11px] text-foreground/80">
                ဤလုပ်ငန်းစဉ်တွင် မြန်မာသံရုံးနှင့် ဆက်သွယ်ရန် လိုအပ်ပါသည်။ စစ်မှုထမ်းရွေးနိုင်သော အသက်အရွယ်ရှိသူများ သတိထားပါ။
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                This process requires Myanmar embassy contact. Be cautious if you are within conscription age range.
              </p>
            </div>
          </div>

          {/* Guide content */}
          <div className="space-y-5">
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                Pink Card ဆိုတာ ဘာလဲ?
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                Pink Card (บัตรชมพู) သည် ထိုင်းနိုင်ငံတွင် တရားဝင်အလုပ်လုပ်ခွင့်ပြုသော ကတ်ဖြစ်ပါသည်။ ၂ နှစ်သက်တမ်းရှိပြီး သက်တမ်းတိုးနိုင်ပါသည်။
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The Pink Card (บัตรชมพู) is a Thai work authorization card valid for 2 years and renewable.
              </p>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                လိုအပ်သော စာရွက်စာတမ်းများ
              </h2>
              <ul className="space-y-2">
                {[
                  { mm: "ပတ်(စ်)ပို့ မူရင်း + မိတ္တူ", en: "Original passport + copy" },
                  { mm: "ဓာတ်ပုံ ၂ပုံ (1.5 x 2 inch)", en: "2 photos (1.5 x 2 inch)" },
                  { mm: "အလုပ်ရှင်ထံမှ စာ (ထိုင်းဘာသာ)", en: "Employment letter from employer (Thai)" },
                  { mm: "ကျန်းမာရေး စစ်ဆေးချက် ရလဒ်", en: "Health check results" },
                  { mm: "အလုပ်ရှင်၏ လုပ်ငန်းမှတ်ပုံတင်", en: "Employer's business registration" },
                ].map((doc) => (
                  <li key={doc.en} className="flex items-start gap-2.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" />
                    <div>
                      <p className="text-sm text-foreground/80">{doc.mm}</p>
                      <p className="text-[11px] text-muted-foreground">{doc.en}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                ကုန်ကျစရိတ်
              </h2>
              <div className="rounded-xl bg-card p-3.5 shadow-card">
                <div className="space-y-2">
                  {[
                    { item: "ကျန်းမာရေးစစ်ဆေးခ", cost: "500-800 THB" },
                    { item: "Pink Card လျှောက်ထားခ", cost: "1,900 THB" },
                    { item: "Work Permit ကြေး", cost: "3,000 THB" },
                  ].map((c) => (
                    <div key={c.item} className="flex items-center justify-between">
                      <span className="text-xs text-foreground/80">{c.item}</span>
                      <span className="text-xs font-semibold text-foreground">{c.cost}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">စုစုပေါင်း · Total</span>
                      <span className="text-sm font-bold text-primary">~5,400-5,700 THB</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Scam warning */}
            <div className="rounded-xl bg-destructive/5 p-3.5">
              <h3 className="mb-1 text-xs font-bold text-destructive">🚨 အလိမ်အညာ သတိပေးချက် · Scam Alert</h3>
              <p className="text-[11px] text-foreground/80">
                Broker များက 10,000-15,000 THB တောင်းခံနိုင်ပါတယ်။ တရားဝင်ကုန်ကျစရိတ်သည် 6,000 THB အောက်ဖြစ်ပါသည်။ အလိမ်ခံရပါက ThweSone Community တွင် သတင်းပို့ပါ။
              </p>
            </div>
          </div>

          {/* Feedback */}
          <div className="mt-6 rounded-xl bg-card p-4 shadow-card">
            <p className="mb-3 text-sm font-semibold text-foreground">ဤလမ်းညွှန်ချက် အကူအညီဖြစ်ပါသလား?</p>
            <div className="flex gap-3">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald/10 py-2.5 text-xs font-medium text-emerald">
                <ThumbsUp className="h-4 w-4" /> ဟုတ်ပါတယ်
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-xs font-medium text-muted-foreground">
                <ThumbsDown className="h-4 w-4" /> မဟုတ်ပါ
              </button>
              <button className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuideDetail;
