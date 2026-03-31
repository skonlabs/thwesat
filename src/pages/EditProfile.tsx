import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, X, Plus, MapPin, Globe, Mail, Phone, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const EditProfile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const [name, setName] = useState("Maung Maung");
  const [headline, setHeadline] = useState("Full Stack Developer");
  const [bio, setBio] = useState("Passionate developer from Myanmar, currently based in Bangkok. Experienced in React, Node.js, and cloud technologies.");
  const [location, setLocation] = useState("Bangkok, Thailand");
  const [email, setEmail] = useState("maungmaung@email.com");
  const [phone, setPhone] = useState("+66 98 765 4321");
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState(["React", "TypeScript", "Node.js", "UI/UX Design", "Project Management", "English (Fluent)"]);
  const [newSkill, setNewSkill] = useState("");
  const [languages, setLanguages] = useState(["Myanmar (Native)", "English (Fluent)", "Thai (Basic)"]);
  const [newLanguage, setNewLanguage] = useState("");
  const [experience, setExperience] = useState("3");
  const [remoteReady, setRemoteReady] = useState(true);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

  const addLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage("");
    }
  };

  const removeLanguage = (l: string) => setLanguages(languages.filter(x => x !== l));

  const handleSave = () => {
    toast({
      title: lang === "my" ? "ပရိုဖိုင် သိမ်းဆည်းပြီး ✓" : "Profile saved ✓",
      description: lang === "my" ? "သင့်ပရိုဖိုင်ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ" : "Your profile has been updated successfully",
    });
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile"} />
      <div className="px-6">

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold text-2xl font-bold text-primary-foreground">MM</div>
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{lang === "my" ? "ဓာတ်ပုံ ပြောင်းရန်" : "Change photo"}</p>
        </motion.div>

        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အခြေခံ အချက်အလက်" : "Basic Information"}</h2>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "အမည်" : "Full Name"}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "ရာထူး" : "Headline"}</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Full Stack Developer" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်း" : "Bio"}</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={lang === "my" ? "သင့်အကြောင်း ရေးပါ..." : "Tell us about yourself..."} className="min-h-[80px] rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">{lang === "my" ? "အတွေ့အကြုံ (နှစ်)" : "Experience (years)"}</Label>
            <Input value={experience} onChange={e => setExperience(e.target.value)} type="number" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
        </motion.div>

        {/* Location & Contact */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "တည်နေရာနှင့် ဆက်သွယ်ရန်" : "Location & Contact"}</h2>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{lang === "my" ? "တည်နေရာ" : "Location"}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Mail className="mr-1 inline h-3 w-3" />{lang === "my" ? "အီးမေးလ်" : "Email"}</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Phone className="mr-1 inline h-3 w-3" />{lang === "my" ? "ဖုန်းနံပါတ်" : "Phone"}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground"><Globe className="mr-1 inline h-3 w-3" />{lang === "my" ? "ဝဘ်ဆိုက်" : "Website / Portfolio"}</Label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="h-11 rounded-xl border-border bg-muted/50 text-sm" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{lang === "my" ? "Remote Ready" : "Remote Ready"}</span>
            </div>
            <button onClick={() => setRemoteReady(!remoteReady)} className={`h-6 w-11 rounded-full transition-colors ${remoteReady ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${remoteReady ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {skill}
                <button onClick={() => removeSkill(skill)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()} placeholder={lang === "my" ? "ကျွမ်းကျင်မှု ထည့်ရန်..." : "Add a skill..."} className="h-10 rounded-xl border-border bg-muted/50 text-sm" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
          </div>
        </motion.div>

        {/* Languages */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဘာသာစကားများ" : "Languages"}</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {languages.map(l => (
              <span key={l} className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                {l}
                <button onClick={() => removeLanguage(l)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newLanguage} onChange={e => setNewLanguage(e.target.value)} onKeyDown={e => e.key === "Enter" && addLanguage()} placeholder={lang === "my" ? "ဘာသာစကား ထည့်ရန်..." : "Add a language..."} className="h-10 rounded-xl border-border bg-muted/50 text-sm" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={addLanguage}><Plus className="h-4 w-4" /></Button>
          </div>
        </motion.div>

        {/* Save button bottom */}
        <Button variant="gold" size="xl" className="mt-6 w-full rounded-2xl" onClick={handleSave}>
          {lang === "my" ? "ပြောင်းလဲမှုများ သိမ်းဆည်းရန်" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default EditProfile;
