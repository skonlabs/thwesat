import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Plus, MapPin, Globe, Mail, Phone, Save, Briefcase, CreditCard, Laptop, Wifi, ChevronDown, Search, Check, Eye, EyeOff, Users, Lock, Camera, Loader2, User, MessageSquare, Clock, Sparkles, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
// backPath added below

// --- Data ---

const LOCATIONS = [
  // Myanmar
  "Yangon, Myanmar", "Mandalay, Myanmar", "Naypyidaw, Myanmar", "Mawlamyine, Myanmar", "Bago, Myanmar", "Pathein, Myanmar", "Taunggyi, Myanmar", "Monywa, Myanmar", "Meiktila, Myanmar", "Myitkyina, Myanmar", "Sagaing, Myanmar", "Sittwe, Myanmar", "Hpa-An, Myanmar", "Lashio, Myanmar", "Dawei, Myanmar", "Myeik, Myanmar", "Pakokku, Myanmar", "Magway, Myanmar", "Pyay, Myanmar", "Loikaw, Myanmar", "Hakha, Myanmar", "Kengtung, Myanmar",
  // Thailand
  "Bangkok, Thailand", "Chiang Mai, Thailand", "Chiang Rai, Thailand", "Phuket, Thailand", "Pattaya, Thailand", "Nonthaburi, Thailand", "Hat Yai, Thailand", "Khon Kaen, Thailand", "Nakhon Ratchasima, Thailand", "Udon Thani, Thailand", "Mae Sot, Thailand", "Tak, Thailand",
  // Malaysia
  "Kuala Lumpur, Malaysia", "Penang, Malaysia", "Johor Bahru, Malaysia", "Ipoh, Malaysia", "Kuching, Malaysia", "Kota Kinabalu, Malaysia", "Malacca, Malaysia", "Shah Alam, Malaysia", "Petaling Jaya, Malaysia", "Cyberjaya, Malaysia",
  // Singapore
  "Singapore, Singapore",
  // Indonesia
  "Jakarta, Indonesia", "Surabaya, Indonesia", "Bandung, Indonesia", "Medan, Indonesia", "Semarang, Indonesia", "Makassar, Indonesia", "Denpasar (Bali), Indonesia", "Yogyakarta, Indonesia", "Palembang, Indonesia", "Batam, Indonesia",
  // Philippines
  "Manila, Philippines", "Cebu City, Philippines", "Davao City, Philippines", "Quezon City, Philippines", "Makati, Philippines", "Taguig (BGC), Philippines", "Clark, Philippines", "Iloilo City, Philippines",
  // Vietnam
  "Ho Chi Minh City, Vietnam", "Hanoi, Vietnam", "Da Nang, Vietnam", "Hai Phong, Vietnam", "Can Tho, Vietnam", "Nha Trang, Vietnam", "Hue, Vietnam",
  // Cambodia
  "Phnom Penh, Cambodia", "Siem Reap, Cambodia", "Battambang, Cambodia", "Sihanoukville, Cambodia",
  // Laos
  "Vientiane, Laos", "Luang Prabang, Laos", "Pakse, Laos",
  // Japan
  "Tokyo, Japan", "Osaka, Japan", "Yokohama, Japan", "Nagoya, Japan", "Fukuoka, Japan", "Sapporo, Japan", "Kyoto, Japan", "Kobe, Japan", "Sendai, Japan",
  // South Korea
  "Seoul, South Korea", "Busan, South Korea", "Incheon, South Korea", "Daegu, South Korea", "Daejeon, South Korea", "Jeju, South Korea",
  // China
  "Beijing, China", "Shanghai, China", "Shenzhen, China", "Guangzhou, China", "Chengdu, China", "Hangzhou, China", "Nanjing, China", "Wuhan, China", "Xi'an, China", "Suzhou, China",
  // Taiwan
  "Taipei, Taiwan", "Kaohsiung, Taiwan", "Taichung, Taiwan", "Tainan, Taiwan", "Hsinchu, Taiwan",
  // Hong Kong & Macau
  "Hong Kong, Hong Kong", "Macau, Macau",
  // India
  "Mumbai, India", "Bangalore, India", "New Delhi, India", "Hyderabad, India", "Chennai, India", "Pune, India", "Kolkata, India", "Ahmedabad, India", "Gurgaon, India", "Noida, India",
  // Bangladesh
  "Dhaka, Bangladesh", "Chittagong, Bangladesh", "Sylhet, Bangladesh",
  // Sri Lanka
  "Colombo, Sri Lanka", "Kandy, Sri Lanka", "Galle, Sri Lanka",
  // Nepal
  "Kathmandu, Nepal", "Pokhara, Nepal", "Lalitpur, Nepal",
  // Pakistan
  "Karachi, Pakistan", "Lahore, Pakistan", "Islamabad, Pakistan", "Rawalpindi, Pakistan", "Faisalabad, Pakistan",
  // Australia
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia", "Perth, Australia", "Adelaide, Australia", "Canberra, Australia", "Gold Coast, Australia",
  // New Zealand
  "Auckland, New Zealand", "Wellington, New Zealand", "Christchurch, New Zealand",
  // Mongolia
  "Ulaanbaatar, Mongolia",
  // Brunei
  "Bandar Seri Begawan, Brunei",
  // Timor-Leste
  "Dili, Timor-Leste",
  // Maldives
  "Malé, Maldives",
  // Fiji & Pacific
  "Suva, Fiji", "Port Moresby, Papua New Guinea",
  // UAE & Middle East (popular for APAC diaspora)
  "Dubai, UAE", "Abu Dhabi, UAE", "Doha, Qatar",
  // Remote
  "Remote / Anywhere",
];

const COUNTRY_CODES = [
  { code: "+95", country: "🇲🇲 MM", label: "Myanmar (+95)" },
  { code: "+66", country: "🇹🇭 TH", label: "Thailand (+66)" },
  { code: "+60", country: "🇲🇾 MY", label: "Malaysia (+60)" },
  { code: "+65", country: "🇸🇬 SG", label: "Singapore (+65)" },
  { code: "+81", country: "🇯🇵 JP", label: "Japan (+81)" },
  { code: "+82", country: "🇰🇷 KR", label: "South Korea (+82)" },
  { code: "+971", country: "🇦🇪 AE", label: "UAE (+971)" },
  { code: "+44", country: "🇬🇧 UK", label: "UK (+44)" },
  { code: "+1", country: "🇺🇸 US", label: "USA (+1)" },
  { code: "+61", country: "🇦🇺 AU", label: "Australia (+61)" },
  { code: "+49", country: "🇩🇪 DE", label: "Germany (+49)" },
];

const WORK_TYPES = [
  { value: "remote_full", label: { en: "Remote Full-time", my: "Remote အပြည့်" } },
  { value: "remote_part", label: { en: "Remote Part-time", my: "Remote အချိန်ပိုင်း" } },
  { value: "remote_contract", label: { en: "Remote Contract", my: "Remote ကန်ထရိုက်" } },
  { value: "freelance", label: { en: "Freelance / Gig", my: "Freelance / Gig" } },
  { value: "hybrid", label: { en: "Hybrid", my: "Hybrid" } },
  { value: "onsite", label: { en: "On-site", my: "ကုမ္ပဏီတွင်" } },
  { value: "internship", label: { en: "Internship", my: "Internship" } },
];

const SUGGESTED_SKILLS = [
  // Tech & IT
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "PHP", "HTML/CSS", "SQL", "AWS", "Docker", "Flutter", "React Native", "WordPress", "Shopify", "Git", "Linux", "Cybersecurity", "Cloud Computing", "DevOps", "Machine Learning", "AI / ChatGPT",
  // Design & Creative
  "Figma", "UI/UX Design", "Graphic Design", "Adobe Photoshop", "Adobe Illustrator", "Adobe Premiere Pro", "After Effects", "Canva", "Video Editing", "Photography", "Animation", "3D Modeling", "Interior Design", "Fashion Design",
  // Marketing & Communications
  "SEO", "Digital Marketing", "Social Media Marketing", "Content Writing", "Copywriting", "Email Marketing", "Google Ads", "Facebook Ads", "Public Relations", "Brand Strategy", "Influencer Marketing",
  // Business & Admin
  "Data Entry", "Virtual Assistant", "Customer Service", "Project Management", "Business Development", "Sales", "Negotiation", "Human Resources", "Recruiting", "Office Administration", "Executive Assistant", "Procurement",
  // Finance & Accounting
  "Excel", "Google Sheets", "Data Analysis", "Accounting", "Bookkeeping", "Financial Analysis", "Budgeting", "Tax Preparation", "Payroll", "QuickBooks", "SAP",
  // Language & Education
  "Translation", "Interpretation", "Teaching / Tutoring", "IELTS / TOEFL Prep", "Curriculum Development", "E-Learning", "English Language", "Japanese Language", "Korean Language", "Chinese Language",
  // Hospitality & Service
  "Hotel Management", "Restaurant Management", "Food & Beverage", "Barista", "Cooking / Chef", "Event Planning", "Tourism & Travel", "Front Desk", "Housekeeping",
  // Construction & Engineering
  "Civil Engineering", "Electrical Engineering", "Mechanical Engineering", "Architecture", "AutoCAD", "Surveying", "Welding", "Plumbing", "Carpentry", "Construction Management",
  // Healthcare & Wellness
  "Nursing", "Caregiving", "First Aid / CPR", "Pharmacy", "Medical Coding", "Lab Technician", "Nutrition", "Fitness Training", "Massage Therapy",
  // Manufacturing & Trades
  "Sewing / Garment", "Quality Control", "Machine Operation", "Warehouse Management", "Forklift Operation", "Logistics", "Supply Chain", "Inventory Management",
  // Agriculture & Environment
  "Farming", "Aquaculture", "Forestry", "Environmental Science", "Sustainability",
  // Legal & Compliance
  "Legal Research", "Contract Management", "Compliance", "Immigration Law",
  // Driving & Transport
  "Driving (Car)", "Driving (Truck/Heavy)", "Delivery", "Shipping & Freight",
  // Soft Skills
  "Leadership", "Communication", "Teamwork", "Problem Solving", "Time Management", "Critical Thinking", "Adaptability", "Conflict Resolution",
];

const ALL_LANGUAGES = [
  "Burmese (Myanmar)", "English", "Thai", "Malay", "Japanese", "Korean", "Chinese (Mandarin)", "Chinese (Cantonese)",
  "Hindi", "Arabic", "French", "German", "Spanish", "Portuguese", "Russian", "Vietnamese",
  "Indonesian", "Tagalog", "Bengali", "Nepali", "Shan", "Karen", "Kachin", "Mon", "Chin",
];

const VISIBILITY_OPTIONS = [
  {
    value: "public",
    icon: Eye,
    label: { en: "Public", my: "အားလုံးမြင်နိုင်" },
    desc: { en: "Anyone on the internet can find and view your profile", my: "အင်တာနက်ပေါ်ရှိ မည်သူမဆို သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်" },
  },
  {
    value: "members",
    icon: Users,
    label: { en: "Community Only", my: "အဖွဲ့ဝင်များသာ" },
    desc: { en: "Only registered ThweSone members can see your profile", my: "ThweSone အဖွဲ့ဝင်များသာ သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်" },
  },
  {
    value: "employers",
    icon: Briefcase,
    label: { en: "Employers Only", my: "အလုပ်ရှင်များသာ" },
    desc: { en: "Only verified employers can view your profile and contact you", my: "အတည်ပြုပြီး အလုပ်ရှင်များသာ သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်" },
  },
  {
    value: "private",
    icon: Lock,
    label: { en: "Private", my: "ကိုယ်တိုင်သာ" },
    desc: { en: "Only you can see your profile. Hidden from search and listings", my: "သင်သာလျှင် သင့်ပရိုဖိုင်ကို မြင်နိုင်ပြီး ရှာဖွေမှုတွင် မပါဝင်ပါ" },
  },
];

// --- Helpers ---

function parsePhone(raw: string): { countryCode: string; number: string } {
  for (const cc of COUNTRY_CODES) {
    if (raw.startsWith(cc.code)) {
      return { countryCode: cc.code, number: raw.slice(cc.code.length).trim() };
    }
  }
  return { countryCode: "+95", number: raw.replace(/^\+/, "") };
}

function formatPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)}`;
}

// --- Component ---

const EditProfile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+95");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [experience, setExperience] = useState("");
  const [visibility, setVisibility] = useState("members");
  const [preferredWorkTypes, setPreferredWorkTypes] = useState<string[]>([]);
  const [hasPayoneer, setHasPayoneer] = useState(false);
  const [hasWise, setHasWise] = useState(false);
  const [hasUpwork, setHasUpwork] = useState(false);
  const [hasLaptop, setHasLaptop] = useState(false);
  const [internetStable, setInternetStable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const locationRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setHeadline(profile.headline || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setLocationSearch(profile.location || "");
      setEmail(profile.email || "");
      const parsed = parsePhone(profile.phone || "");
      setPhoneCountryCode(parsed.countryCode);
      setPhoneNumber(parsed.number);
      setWebsite(profile.website || "");
      setSkills(profile.skills || []);
      setLanguages(profile.languages || []);
      setExperience(profile.experience || "");
      setVisibility(profile.visibility || "members");
      setPreferredWorkTypes(profile.preferred_work_types || []);
      setHasPayoneer(profile.has_payoneer || false);
      setHasWise(profile.has_wise || false);
      setHasUpwork(profile.has_upwork || false);
      setHasLaptop(profile.has_laptop || false);
      setInternetStable(profile.internet_stable || false);
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: lang === "my" ? "ဓာတ်ပုံဖိုင်သာ ရွေးပါ" : "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: lang === "my" ? "ဖိုင်အရွယ်အစား 5MB ထက်မကျော်ရ" : "File must be under 5MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      setAvatarUrl(url);
      await refreshProfile();
    } catch (err: any) {
      toast({ title: lang === "my" ? "ဓာတ်ပုံတင်ရာတွင် အမှားဖြစ်ပါသည်" : "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setShowLocationDropdown(false);
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setShowSkillSuggestions(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLanguageDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return LOCATIONS;
    const q = locationSearch.toLowerCase();
    return LOCATIONS.filter(l => l.toLowerCase().includes(q));
  }, [locationSearch]);

  const filteredSkillSuggestions = useMemo(() => {
    const q = newSkill.toLowerCase();
    return SUGGESTED_SKILLS.filter(s => !skills.includes(s) && (!q || s.toLowerCase().includes(q)));
  }, [newSkill, skills]);

  const filteredLanguages = useMemo(() => {
    const q = languageSearch.toLowerCase();
    return ALL_LANGUAGES.filter(l => !languages.includes(l) && (!q || l.toLowerCase().includes(q)));
  }, [languageSearch, languages]);

  const addSkill = (skill?: string) => {
    const s = (skill || newSkill).trim();
    if (s && !skills.includes(s) && skills.length < 30) {
      setSkills([...skills, s]);
      setNewSkill("");
      setShowSkillSuggestions(false);
    }
  };
  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));
  const addLanguage = (l: string) => {
    if (!languages.includes(l) && languages.length < 5) {
      setLanguages([...languages, l]);
      setLanguageSearch("");
      setShowLanguageDropdown(false);
    }
    if (languages.length >= 5) {
      // Already at limit - just close
      setLanguageSearch("");
      setShowLanguageDropdown(false);
    }
  };
  const removeLanguage = (l: string) => setLanguages(languages.filter(x => x !== l));
  const toggleWorkType = (type: string) => setPreferredWorkTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const fullPhone = phoneNumber ? `${phoneCountryCode}${phoneNumber.replace(/\s/g, "")}` : "";
    const { error } = await supabase.from("profiles").update({
      display_name: name, headline, bio, location, email, phone: fullPhone, website,
      skills, languages, experience, visibility, preferred_work_types: preferredWorkTypes,
      has_payoneer: hasPayoneer, has_wise: hasWise, has_upwork: hasUpwork,
      has_laptop: hasLaptop, internet_stable: internetStable,
      remote_ready: hasLaptop && internetStable,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: lang === "my" ? "အမှား ဖြစ်ပါသည်" : "Error saving", variant: "destructive" });
      return;
    }
    await refreshProfile();
    navigate("/profile");
  };

  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile"} backPath="/profile" />
      <div className="px-5 space-y-4">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 pb-2 flex flex-col items-center">
          <div className="relative">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground overflow-hidden ring-4 ring-primary/10">
              {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" alt="" /> : initial}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-background bg-primary text-primary-foreground shadow-lg transition-all active:scale-90 hover:bg-primary/90"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" strokeWidth={1.5} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground font-medium">{lang === "my" ? "ဓာတ်ပုံ ပြောင်းရန် နှိပ်ပါ" : "Tap to change photo"}</p>
        </motion.div>

        {/* Basic Information */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အခြေခံ အချက်အလက်" : "Basic Information"}</h2>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ပြသမည့်အမည်" : "Display Name"}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ရာထူး" : "Headline"}</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} className="h-11 rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "Bio"}</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} className="min-h-[80px] rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အတွေ့အကြုံ (နှစ်)" : "Experience (years)"}</Label>
            <Input value={experience} onChange={e => setExperience(e.target.value)} className="h-11 rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30" />
          </div>
        </motion.div>

        {/* Profile Visibility */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility"}</h2>
          </div>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)} className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${visibility === opt.value ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border hover:border-border/80 active:bg-muted"}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${visibility === opt.value ? "bg-primary/15" : "bg-muted"}`}>
                  <opt.icon className={`h-4 w-4 ${visibility === opt.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${visibility === opt.value ? "text-primary" : "text-foreground"}`}>{opt.label[lang]}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{opt.desc[lang]}</p>
                </div>
                {visibility === opt.value && <Check className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={2} />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Preferred Work Type */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
              <Briefcase className="h-4 w-4 text-accent-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ဦးစားပေး အလုပ်အမျိုးအစား" : "Preferred Work Type"}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map(opt => (
              <button key={opt.value} onClick={() => toggleWorkType(opt.value)} className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${preferredWorkTypes.includes(opt.value) ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border text-muted-foreground hover:border-border/80"}`}>
                {opt.label[lang]}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Location & Contact */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "တည်နေရာနှင့် ဆက်သွယ်ရန်" : "Location & Contact"}</h2>
          </div>

          {/* Location dropdown */}
          <div ref={locationRef} className="relative">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "တည်နေရာ" : "Location"}</Label>
            <div className="relative">
              <Input
                value={locationSearch}
                onChange={e => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder={lang === "my" ? "မြို့နာမည် ရိုက်ထည့်ပါ..." : "Search city..."}
                className="h-11 rounded-xl border-border bg-muted/30 pr-8 text-sm focus-visible:ring-primary/30"
              />
              <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            {showLocationDropdown && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {filteredLocations.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">{lang === "my" ? "ရလဒ် မရှိပါ" : "No results"}</div>
                ) : filteredLocations.map(loc => (
                  <button key={loc} onClick={() => { setLocation(loc); setLocationSearch(loc); setShowLocationDropdown(false); }} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted ${location === loc ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}>
                    <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-11 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30" />
            </div>
          </div>

          {/* Phone with country code */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ဖုန်းနံပါတ်" : "Phone"}</Label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryCodePicker(!showCountryCodePicker)}
                  className="flex h-11 items-center gap-1 rounded-xl border border-border bg-muted/30 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  {COUNTRY_CODES.find(c => c.code === phoneCountryCode)?.country || "🌐"} {phoneCountryCode}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showCountryCodePicker && (
                  <div className="absolute z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                    {COUNTRY_CODES.map(cc => (
                      <button key={cc.code} onClick={() => { setPhoneCountryCode(cc.code); setShowCountryCodePicker(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted ${phoneCountryCode === cc.code ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}>
                        {cc.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                value={formatPhoneDigits(phoneNumber)}
                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="xxx xxxx xxxx"
                className="h-11 flex-1 rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{lang === "my" ? "ဝဘ်ဆိုက်" : "Website"}</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="h-11 rounded-xl border-border bg-muted/30 pl-10 text-sm focus-visible:ring-primary/30" />
            </div>
          </div>
        </motion.div>

        {/* Remote Work Readiness */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Wifi className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "Remote Work အသင့်အနေ" : "Remote Work Readiness"}</h2>
          </div>
          <div className="space-y-1.5">
            {[
              { label: lang === "my" ? "Laptop ရှိ" : "Has Laptop", icon: Laptop, value: hasLaptop, toggle: () => setHasLaptop(!hasLaptop) },
              { label: lang === "my" ? "Internet တည်ငြိမ်" : "Stable Internet", icon: Wifi, value: internetStable, toggle: () => setInternetStable(!internetStable) },
              { label: "Payoneer", icon: CreditCard, value: hasPayoneer, toggle: () => setHasPayoneer(!hasPayoneer) },
              { label: "Wise", icon: CreditCard, value: hasWise, toggle: () => setHasWise(!hasWise) },
              { label: "Upwork", icon: Briefcase, value: hasUpwork, toggle: () => setHasUpwork(!hasUpwork) },
            ].map((item, i) => (
              <button key={i} onClick={item.toggle} className={`flex w-full items-center justify-between rounded-xl p-3.5 transition-all ${item.value ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.value ? "bg-primary/10" : "bg-muted"}`}>
                    <item.icon className={`h-4 w-4 ${item.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <span className={`text-sm font-medium ${item.value ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                </div>
                <div className={`h-6 w-11 rounded-full transition-colors ${item.value ? "bg-primary" : "bg-muted-foreground/25"}`}>
                  <div className={`h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${item.value ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{skills.length}/30</span>
          </div>
          {skills.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {skills.map(skill => (
                <span key={skill} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="rounded-full p-0.5 transition-colors hover:bg-primary/20 active:bg-primary/30"><X className="h-3 w-3" strokeWidth={2} /></button>
                </span>
              ))}
            </div>
          )}
          <div ref={skillRef} className="relative">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={e => { setNewSkill(e.target.value); setShowSkillSuggestions(true); }}
                onFocus={() => setShowSkillSuggestions(true)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder={lang === "my" ? "ကျွမ်းကျင်မှု ထည့်ရန်..." : "Add a skill..."}
                className="h-10 rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-primary/30"
              />
              <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl border-border p-0" onClick={() => addSkill()}><Plus className="h-4 w-4" strokeWidth={1.5} /></Button>
            </div>
            {showSkillSuggestions && filteredSkillSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {filteredSkillSuggestions.slice(0, 15).map(s => (
                  <button key={s} onClick={() => addSkill(s)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                    <Plus className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Languages */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                <Languages className="h-4 w-4 text-accent-foreground" strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ဘာသာစကားများ" : "Languages"}</h2>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{languages.length}/5</span>
          </div>
          {languages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {languages.map(l => (
                <span key={l} className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                  {l}
                  <button onClick={() => removeLanguage(l)} className="rounded-full p-0.5 transition-colors hover:bg-accent/20 active:bg-accent/30"><X className="h-3 w-3" strokeWidth={2} /></button>
                </span>
              ))}
            </div>
          )}
          <div ref={langRef} className="relative">
            <div className="relative">
              <Input
                value={languageSearch}
                onChange={e => { setLanguageSearch(e.target.value); setShowLanguageDropdown(true); }}
                onFocus={() => setShowLanguageDropdown(true)}
                placeholder={lang === "my" ? "ဘာသာစကား ရှာပါ..." : "Search language..."}
                className="h-10 rounded-xl border-border bg-muted/30 pr-8 text-sm focus-visible:ring-primary/30"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            {showLanguageDropdown && filteredLanguages.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {filteredLanguages.map(l => (
                  <button key={l} onClick={() => addLanguage(l)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                    <Plus className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="pt-2 pb-4">
          <Button variant="default" size="lg" className="w-full rounded-2xl shadow-navy" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-5 w-5" strokeWidth={1.5} />
            {saving ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "ပြောင်းလဲမှုများ သိမ်းဆည်းရန်" : "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
