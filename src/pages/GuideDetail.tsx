import { useState } from "react";
import { Shield, AlertTriangle, Clock, CheckCircle, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const GuideDetail = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  const handleFeedback = (type: "yes" | "no") => {
    setFeedback(type);
    toast({
      title: type === "yes"
        ? (lang === "my" ? "ကျေးဇူးတင်ပါသည်!" : "Thank you!")
        : (lang === "my" ? "တုံ့ပြန်ချက် မှတ်တမ်းတင်ပြီးပါပြီ" : "Feedback recorded"),
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Thai Pink Card Application Guide", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} />
      <div className="px-6">

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            {lang === "my" ? "ဗီဇာ" : "Visa"} · 🇹🇭 Thailand
          </span>
          <h1 className="mb-2 text-xl font-bold leading-tight text-foreground">
            {lang === "my" ? "ထိုင်း Pink Card လျှောက်ထားနည်း" : "Thai Pink Card Application Guide"}
          </h1>

          <div className="mb-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[10px] font-medium text-emerald">
              <CheckCircle className="h-3 w-3" /> {lang === "my" ? "MAP Foundation မှ အတည်ပြု" : "Verified by MAP Foundation"}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {lang === "my" ? "10 မိနစ် ဖတ်ရန်" : "10 min read"}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              📅 {lang === "my" ? "မတ် ၂၀၂၆ ပြင်ဆင်ပြီး" : "Updated Mar 2026"}
            </span>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-destructive/5 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-semibold text-destructive">⚠️ {lang === "my" ? "သတိပေးချက်" : "Warning"}</p>
              <p className="mt-0.5 text-[11px] text-foreground/80">
                {lang === "my"
                  ? "ဤလုပ်ငန်းစဉ်တွင် မြန်မာသံရုံးနှင့် ဆက်သွယ်ရန် လိုအပ်ပါသည်။ စစ်မှုထမ်းရွေးနိုင်သော အသက်အရွယ်ရှိသူများ သတိထားပါ။"
                  : "This process requires Myanmar embassy contact. Be cautious if you are within conscription age range."}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                {lang === "my" ? "Pink Card ဆိုတာ ဘာလဲ?" : "What is a Pink Card?"}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">
                {lang === "my"
                  ? "Pink Card (บัตรชมพู) သည် ထိုင်းနိုင်ငံတွင် တရားဝင်အလုပ်လုပ်ခွင့်ပြုသော ကတ်ဖြစ်ပါသည်။ ၂ နှစ်သက်တမ်းရှိပြီး သက်တမ်းတိုးနိုင်ပါသည်။"
                  : "The Pink Card (บัตรชมพู) is a Thai work authorization card valid for 2 years and renewable."}
              </p>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                {lang === "my" ? "လိုအပ်သော စာရွက်စာတမ်းများ" : "Required Documents"}
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
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.5} />
                    <p className="text-sm text-foreground/80">{lang === "my" ? doc.mm : doc.en}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                {lang === "my" ? "ကုန်ကျစရိတ်" : "Costs"}
              </h2>
              <div className="rounded-xl border border-border bg-card p-3.5">
                <div className="space-y-2">
                  {[
                    { item: { my: "ကျန်းမာရေးစစ်ဆေးခ", en: "Health check fee" }, cost: "500-800 THB" },
                    { item: { my: "Pink Card လျှောက်ထားခ", en: "Pink Card application fee" }, cost: "1,900 THB" },
                    { item: { my: "Work Permit ကြေး", en: "Work Permit fee" }, cost: "3,000 THB" },
                  ].map((c) => (
                    <div key={c.item.en} className="flex items-center justify-between">
                      <span className="text-xs text-foreground/80">{lang === "my" ? c.item.my : c.item.en}</span>
                      <span className="text-xs font-semibold text-foreground">{c.cost}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{lang === "my" ? "စုစုပေါင်း" : "Total"}</span>
                      <span className="text-sm font-bold text-primary">~5,400-5,700 THB</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-xl bg-destructive/5 p-3.5">
              <h3 className="mb-1 text-xs font-bold text-destructive">🚨 {lang === "my" ? "အလိမ်အညာ သတိပေးချက်" : "Scam Alert"}</h3>
              <p className="text-[11px] text-foreground/80">
                {lang === "my"
                  ? "Broker များက 10,000-15,000 THB တောင်းခံနိုင်ပါတယ်။ တရားဝင်ကုန်ကျစရိတ်သည် 6,000 THB အောက်ဖြစ်ပါသည်။ အလိမ်ခံရပါက ThweSone Community တွင် သတင်းပို့ပါ။"
                  : "Brokers may charge 10,000-15,000 THB. Official costs are under 6,000 THB. Report scams in the ThweSone Community."}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဤလမ်းညွှန်ချက် အကူအညီဖြစ်ပါသလား?" : "Was this guide helpful?"}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleFeedback("yes")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "yes" ? "bg-emerald text-emerald-foreground" : "bg-emerald/10 text-emerald active:bg-emerald/20"}`}
              >
                <ThumbsUp className="h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ဟုတ်ပါတယ်" : "Yes"}
              </button>
              <button
                onClick={() => handleFeedback("no")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "no" ? "bg-muted-foreground text-white" : "bg-muted text-muted-foreground active:bg-muted/80"}`}
              >
                <ThumbsDown className="h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "မဟုတ်ပါ" : "No"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/80"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuideDetail;
