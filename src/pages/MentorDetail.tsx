import { motion } from "framer-motion";
import { Star, MapPin, Calendar, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const reviews = [
  { author: { my: "ကိုမင်းထက်", en: "Min Htet" }, rating: 5, text: { my: "Resume ပြင်ဆင်ပေးတာ အရမ်းကောင်းပါတယ်။ Upwork မှာ ပထမ client ရခဲ့ပါတယ်!", en: "The resume help was amazing. Got my first Upwork client!" }, time: "2 weeks ago" },
  { author: { my: "မသီရိ", en: "Thiri" }, rating: 5, text: { my: "Career path planning အတွက် အကြံဉာဏ်ကောင်းတွေ ပေးပါတယ်", en: "Great advice on career path planning" }, time: "1 month ago" },
  { author: { my: "ကိုဇော်ဇော်", en: "Zaw Zaw" }, rating: 4, text: { my: "Technical interview preparation အတွက် အရမ်းအကူအညီ ဖြစ်ပါတယ်", en: "Very helpful with technical interview preparation" }, time: "1 month ago" },
];

const MentorDetail = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold text-2xl font-bold text-primary-foreground">KM</div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "ဒေါ်ခင်မြတ်နိုး" : "Khin Myat Noe"}</h1>
            <p className="text-sm text-muted-foreground">Senior Software Engineer</p>
            <p className="text-xs text-muted-foreground">Grab · Singapore</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-bold text-foreground">4.9</span>
                <span className="text-xs text-muted-foreground">(47)</span>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Singapore</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> {lang === "my" ? "ရရှိနိုင်" : "Available"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { value: "47", label: lang === "my" ? "ချိန်းဆိုမှု" : "Sessions" },
              { value: "32", label: lang === "my" ? "လူဦးရေ" : "Mentees" },
              { value: "2 yr", label: lang === "my" ? "အတွေ့အကြုံ" : "Mentoring" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card p-3 text-center shadow-card">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "About"}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {lang === "my"
                ? "Grab Singapore တွင် Senior Software Engineer အဖြစ် ၄ နှစ်ကျော် အတွေ့အကြုံ ရှိပါသည်။ မြန်မာနိုင်ငံမှ ထွက်ခွာလာပြီး Singapore တွင် Remote Work မှ On-site Work သို့ ကူးပြောင်းခဲ့ပါသည်။"
                : "4+ years at Grab Singapore as Senior Software Engineer. Transitioned from remote work to on-site after relocating from Myanmar."}
            </p>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Expertise"}</h2>
            <div className="flex flex-wrap gap-2">
              {["React", "System Design", "Career Coaching", "Resume Review", "Interview Prep", "Singapore Work Visa"].map((s) => (
                <span key={s} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{s}</span>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{lang === "my" ? "ရရှိနိုင်ချိန်" : "Availability"}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { day: { my: "တနင်္လာ", en: "Monday" }, time: "7PM - 9PM (SGT)" },
                { day: { my: "ဗုဒ္ဓဟူး", en: "Wednesday" }, time: "7PM - 9PM (SGT)" },
                { day: { my: "စနေ", en: "Saturday" }, time: "10AM - 12PM (SGT)" },
                { day: { my: "တနင်္ဂနွေ", en: "Sunday" }, time: "2PM - 5PM (SGT)" },
              ].map((s) => (
                <div key={s.day.en} className="rounded-xl bg-card p-2.5 shadow-card">
                  <p className="text-[11px] font-medium text-foreground">{lang === "my" ? s.day.my : s.day.en}</p>
                  <p className="text-[10px] text-muted-foreground">{s.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "သုံးသပ်ချက်များ" : "Reviews"}</h2>
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="rounded-xl bg-card p-3.5 shadow-card">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{lang === "my" ? r.author.my : r.author.en}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80">{lang === "my" ? r.text.my : r.text.en}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{r.time}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-lg pb-safe">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => navigate("/messages/chat")}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
          </Button>
          <Button variant="gold" size="lg" className="flex-1 rounded-xl" onClick={() => navigate("/mentors/book")}>
            <Calendar className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorDetail;
