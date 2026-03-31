import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, X, Plus, MapPin, Globe, Mail, Phone, Save, Briefcase, CreditCard, Laptop, Wifi } from "lucide-react";
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

const EditProfile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState("");
  const [experience, setExperience] = useState("");
  const [visibility, setVisibility] = useState("members");
  const [preferredWorkTypes, setPreferredWorkTypes] = useState<string[]>([]);
  const [hasPayoneer, setHasPayoneer] = useState(false);
  const [hasWise, setHasWise] = useState(false);
  const [hasUpwork, setHasUpwork] = useState(false);
  const [hasLaptop, setHasLaptop] = useState(false);
  const [internetStable, setInternetStable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setHeadline(profile.headline || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
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
    }
  }, [profile]);

  const addSkill = () => { if (newSkill.trim() && !skills.includes(newSkill.trim()) && skills.length < 30) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); } };
  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));
  const addLanguage = () => { if (newLanguage.trim() && !languages.includes(newLanguage.trim())) { setLanguages([...languages, newLanguage.trim()]); setNewLanguage(""); } };
  const removeLanguage = (l: string) => setLanguages(languages.filter(x => x !== l));
  const toggleWorkType = (type: string) => setPreferredWorkTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name, headline, bio, location, email, phone, website,
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
    toast({ title: lang === "my" ? "ပရိုဖိုင် သိမ်းဆည်းပြီး ✓" : "Profile saved ✓" });
    navigate("/profile");
  };

  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="h-24 w-24 rounded-full object-cover" /> : initial}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အခြေခံ အချက်အလက်" : "Basic Information"}</h2>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "ပြသမည့်အမည်" : "Display Name"}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "ရာထူး" : "Headline"}</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "Bio"}</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} className="min-h-[80px] rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "အတွေ့အကြုံ (နှစ်)" : "Experience (years)"}</Label>
            <Input value={experience} onChange={e => setExperience(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "public", label: lang === "my" ? "အားလုံး" : "Public" },
              { value: "members", label: lang === "my" ? "အဖွဲ့ဝင်များ" : "Community" },
              { value: "employers", label: lang === "my" ? "အလုပ်ရှင်များ" : "Employers" },
              { value: "private", label: lang === "my" ? "ကိုယ်တိုင်" : "Private" },
            ].map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${visibility === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဦးစားပေး အလုပ်အမျိုးအစား" : "Preferred Work Type"}</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "remote_full", label: lang === "my" ? "Remote အပြည့်" : "Remote Full-time" },
              { value: "remote_contract", label: lang === "my" ? "Remote ကန်ထရိုက်" : "Remote Contract" },
              { value: "hybrid", label: lang === "my" ? "Hybrid" : "Hybrid" },
            ].map(opt => (
              <button key={opt.value} onClick={() => toggleWorkType(opt.value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${preferredWorkTypes.includes(opt.value) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "တည်နေရာနှင့် ဆက်သွယ်ရန်" : "Location & Contact"}</h2>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" strokeWidth={1.5} />{lang === "my" ? "တည်နေရာ" : "Location"}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Mail className="mr-1 inline h-3 w-3" strokeWidth={1.5} />{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Phone className="mr-1 inline h-3 w-3" strokeWidth={1.5} />{lang === "my" ? "ဖုန်းနံပါတ်" : "Phone"}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Globe className="mr-1 inline h-3 w-3" strokeWidth={1.5} />{lang === "my" ? "ဝဘ်ဆိုက်" : "Website"}</Label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "Remote Work အသင့်အနေ" : "Remote Work Readiness"}</h2>
          <div className="space-y-2">
            {[
              { label: lang === "my" ? "Laptop ရှိ" : "Has Laptop", icon: Laptop, value: hasLaptop, toggle: () => setHasLaptop(!hasLaptop) },
              { label: lang === "my" ? "Internet တည်ငြိမ်" : "Stable Internet", icon: Wifi, value: internetStable, toggle: () => setInternetStable(!internetStable) },
              { label: "Payoneer", icon: CreditCard, value: hasPayoneer, toggle: () => setHasPayoneer(!hasPayoneer) },
              { label: "Wise", icon: CreditCard, value: hasWise, toggle: () => setHasWise(!hasWise) },
              { label: "Upwork", icon: Briefcase, value: hasUpwork, toggle: () => setHasUpwork(!hasUpwork) },
            ].map((item, i) => (
              <button key={i} onClick={item.toggle} className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <div className={`h-6 w-11 rounded-full transition-colors ${item.value ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`h-5 w-5 rounded-full bg-card shadow transition-transform ${item.value ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
            <span className="text-[10px] text-muted-foreground">{skills.length}/30</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {skill}
                <button onClick={() => removeSkill(skill)} className="rounded-full p-0.5 active:bg-primary/20"><X className="h-3 w-3" strokeWidth={1.5} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()} placeholder={lang === "my" ? "ကျွမ်းကျင်မှု ထည့်ရန်..." : "Add a skill..."} className="h-10 rounded-xl border-border bg-muted/50 text-sm" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={addSkill}><Plus className="h-4 w-4" strokeWidth={1.5} /></Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဘာသာစကားများ" : "Languages"}</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {languages.map(l => (
              <span key={l} className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                {l}
                <button onClick={() => removeLanguage(l)} className="rounded-full p-0.5 active:bg-accent/20"><X className="h-3 w-3" strokeWidth={1.5} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newLanguage} onChange={e => setNewLanguage(e.target.value)} onKeyDown={e => e.key === "Enter" && addLanguage()} placeholder={lang === "my" ? "ဘာသာစကား ထည့်ရန်..." : "Add a language..."} className="h-10 rounded-xl border-border bg-muted/50 text-sm" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={addLanguage}><Plus className="h-4 w-4" strokeWidth={1.5} /></Button>
          </div>
        </motion.div>

        <Button variant="default" size="lg" className="mt-6 w-full rounded-2xl" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-5 w-5" strokeWidth={1.5} />
          {saving ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "ပြောင်းလဲမှုများ သိမ်းဆည်းရန်" : "Save Changes")}
        </Button>
      </div>
    </div>
  );
};

export default EditProfile;
