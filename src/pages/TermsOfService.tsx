import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/logo.svg";

const sections = [
  {
    title: { my: "သဘောတူညီချက်", en: "Acceptance of Terms" },
    content: {
      my: "ThweSat ကို အသုံးပြုခြင်းအားဖြင့် ဤစည်းမျဉ်းများကို သဘောတူပါသည်။ မသဘောတူပါက ဝန်ဆောင်မှုကို မအသုံးပြုပါနှင့်။",
      en: "By creating an account or using ThweSat, you agree to these Terms of Service. If you do not agree, please do not use the platform.",
    },
  },
  {
    title: { my: "အကောင့်အတွက် တာဝန်ယူမှု", en: "Account Responsibility" },
    content: {
      my: "သင့်အကောင့်ထဲတွင် ပေးထားသော အချက်အလက်များ မှန်ကန်စေရန်နှင့် စကားဝှက် လုံခြုံမှုကို ထိန်းသိမ်းရန် တာဝန်ရှိပါသည်။ အသက် ၁၆ နှစ်အောက် မဖြစ်ရပါ။",
      en: "You are responsible for the accuracy of information you provide and for keeping your password secure. You must be at least 16 years old to use ThweSat.",
    },
  },
  {
    title: { my: "ခွင့်ပြုမထားသော အသုံးပြုမှု", en: "Prohibited Use" },
    content: {
      my: "လိမ်လည်လှည့်ဖြားခြင်း၊ မမှန်ကန်သော အလုပ်ခေါ်စာများ တင်ခြင်း၊ အခြားသူများကို နှောင့်ယှက်ခြင်း၊ malware တင်ခြင်း သို့မဟုတ် ဥပဒေနှင့် မညီသော အကြောင်းအရာများ တင်ခြင်းတို့ကို တားမြစ်ပါသည်။",
      en: "You must not use ThweSat for fraud, posting fake jobs, harassment, scraping, distributing malware, or any unlawful activity. Violations may result in immediate account termination.",
    },
  },
  {
    title: { my: "ငွေပေးချေမှု နှင့် Credits", en: "Payments & Credits" },
    content: {
      my: "Wallet credits များ၊ placement fees နှင့် mentor session ငွေများကို သက်ဆိုင်ရာ စည်းမျဉ်းများအတိုင်း ကောက်ခံပါသည်။ ဝယ်ယူပြီး credits များကို ပြန်အမ်းပေးခြင်း မရှိပါ၊ မိမိအကောင့်တွင်သာ အသုံးပြုနိုင်ပါသည်။",
      en: "Wallet credits, placement fees, and mentor session fees are charged according to the published pricing. Purchased credits are non-refundable but remain available in your wallet for future use.",
    },
  },
  {
    title: { my: "အကြောင်းအရာ ပိုင်ဆိုင်မှု", en: "Content Ownership" },
    content: {
      my: "သင်တင်ထားသော အကြောင်းအရာ (ပရိုဖိုင်၊ CV၊ post များ) ကို သင်ပိုင်ဆိုင်ပါသည်။ ဝန်ဆောင်မှုကို လည်ပတ်စေရန်အတွက် ThweSat သည် ၎င်းတို့ကို ပြသခွင့်နှင့် သိမ်းဆည်းခွင့် ရှိပါသည်။",
      en: "You retain ownership of content you upload (profile, CV, posts). You grant ThweSat a limited license to host and display this content as needed to operate the service.",
    },
  },
  {
    title: { my: "ဝန်ဆောင်မှု ရပ်ဆိုင်းခြင်း", en: "Termination" },
    content: {
      my: "ဤစည်းမျဉ်းများကို ချိုးဖောက်ပါက အကြောင်းကြားခြင်းမရှိဘဲ အကောင့်ကို ရပ်ဆိုင်းခွင့်ရှိပါသည်။ သင်ကိုယ်တိုင်လည်း အချိန်မရွေး အကောင့်ဖျက်နိုင်ပါသည်။",
      en: "We may suspend or terminate accounts that violate these terms without prior notice. You may also delete your account at any time from Settings.",
    },
  },
  {
    title: { my: "တာဝန်ကင်းလွတ်ခြင်း", en: "Disclaimer & Liability" },
    content: {
      my: "ThweSat သည် အလုပ်ရှာဖွေရေး platform တစ်ခုသာဖြစ်ပြီး၊ အလုပ်ရှင် - အလုပ်သမား ဆက်ဆံရေး၏ ရလဒ်များအတွက် တာဝန်မယူပါ။ ဝန်ဆောင်မှုကို 'as is' အခြေအနေဖြင့် ပေးဆောင်ပါသည်။",
      en: "ThweSat is a marketplace platform. We are not a party to any employment or mentoring relationship and are not liable for outcomes. The service is provided 'as is' without warranties of any kind.",
    },
  },
  {
    title: { my: "ပြောင်းလဲခြင်း", en: "Changes" },
    content: {
      my: "ဤစည်းမျဉ်းများကို မည်သည့်အခါမဆို ပြင်ဆင်နိုင်ပြီး၊ ပြောင်းလဲမှုကြီးကြီးမားမားဖြစ်ပါက အသုံးပြုသူများကို အကြောင်းကြားပါမည်။",
      en: "We may update these terms from time to time. Material changes will be communicated via in-app notice or email.",
    },
  },
];

const TermsOfService = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
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
            <FileText className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {lang === "my" ? "ဝန်ဆောင်မှု စည်းမျဉ်း" : "Terms of Service"}
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
          {lang === "my" ? "မေးစရာရှိပါက " : "Questions? Contact "}
          <a href="mailto:support@thwesat.com" className="text-primary hover:underline">support@thwesat.com</a>
        </p>

        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy-policy" className="hover:text-foreground">
            {lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု မူဝါဒ" : "Privacy Policy"}
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

export default TermsOfService;
