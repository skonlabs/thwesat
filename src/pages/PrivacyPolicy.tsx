import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/logo.svg";

const sections = [
  {
    title: { my: "အချက်အလက် စုဆောင်းခြင်း", en: "Data Collection" },
    content: {
      my: "သင့်အကောင့် ဖန်တီးစဥ် ပေးထားသော အမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်နှင့် ပရိုဖိုင်အချက်အလက်များကို စုဆောင်းပါသည်။ အက်ပ် အသုံးပြုမှု ပုံစံများကိုလည်း ခွဲခြမ်းစိတ်ဖြာရန် စုဆောင်းပါသည်။",
      en: "We collect your name, email, phone number, and profile information provided during account creation. We also collect app usage patterns for analytics purposes. If you sign in with Google, LinkedIn, or Facebook, we receive your basic profile (name, email, avatar) from that provider.",
    },
  },
  {
    title: { my: "အချက်အလက် အသုံးပြုခြင်း", en: "How We Use Your Data" },
    content: {
      my: "သင့်အချက်အလက်များကို ဝန်ဆောင်မှု ပေးရန်၊ အကောင့် လုံခြုံမှု ထိန်းသိမ်းရန်နှင့် အတွေ့အကြုံ ပိုကောင်းအောင် လုပ်ဆောင်ရန် အသုံးပြုပါသည်။ တတိယပုဂ္ဂိုလ်များထံ ရောင်းချခြင်း လုံးဝ မပြုလုပ်ပါ။",
      en: "Your data is used to provide services (matching jobs, mentor bookings, payments), maintain account security, and improve your experience. We never sell your information to third parties.",
    },
  },
  {
    title: { my: "အချက်အလက် ဖျက်ခြင်း", en: "Data Deletion" },
    content: {
      my: "အချိန်မရွေး သင့်အကောင့်ကို ဖျက်နိုင်ပြီး ၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်။ ထိုအချိန်ကျော်ပါက အချက်အလက်အားလုံး အပြီးအပိုင် ဖျက်ပစ်ပါမည်။",
      en: "You can delete your account at any time from Settings, with a 24-hour recovery window. After that period, all personal data is permanently removed from our systems.",
    },
  },
  {
    title: { my: "လုံခြုံရေး", en: "Security" },
    content: {
      my: "သင့်အချက်အလက်များကို encryption နည်းပညာဖြင့် ကာကွယ်ပါသည်။ စကားဝှက်များကို hashed ပုံစံဖြင့်သာ သိမ်းဆည်းပါသည်။",
      en: "Your data is protected using encryption in transit and at rest. Passwords are stored only as salted hashes. Access to production data is restricted and audited.",
    },
  },
  {
    title: { my: "Cookies နှင့် ခြေရာခံခြင်း", en: "Cookies & Tracking" },
    content: {
      my: "စက်ရှင် ထိန်းသိမ်းရန်နှင့် ဝန်ဆောင်မှု ကောင်းမွန်အောင် ကြိုးစားရန် မရှိမဖြစ် cookies များကိုသာ အသုံးပြုပါသည်။",
      en: "We use only essential cookies required to keep you signed in and to operate the service. We do not run third-party advertising trackers.",
    },
  },
];

const PrivacyPolicy = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ThweSat" width={28} height={28} />
            <span className="font-brand text-lg font-semibold">
              <span className="text-foreground">Thwe</span>
              <span className="text-accent">Sat</span>
            </span>
          </Link>
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {lang === "my" ? "အိမ်" : "Home"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု မူဝါဒ" : "Privacy Policy"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lang === "my" ? "နောက်ဆုံးအပ်ဒိတ်: ၂၀၂၆ ခုနှစ် မေလ" : "Last updated: May 2026"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((s, i) => (
            <section key={i} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">{s.title[lang]}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.content[lang]}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {lang === "my"
            ? "မေးစရာရှိပါက "
            : "Questions? Contact "}
          <a href="mailto:support@thwesat.com" className="text-primary hover:underline">support@thwesat.com</a>
        </p>

        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms-of-service" className="hover:text-foreground">
            {lang === "my" ? "ဝန်ဆောင်မှု စည်းမျဉ်း" : "Terms of Service"}
          </Link>
          <span>·</span>
          <Link to="/" className="hover:text-foreground">
            {lang === "my" ? "အိမ်သို့ ပြန်သွားရန်" : "Back to home"}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
