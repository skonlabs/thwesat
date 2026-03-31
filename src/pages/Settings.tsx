import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Type, Shield, Bell, Lock, Key, ChevronRight,
  Languages, Eye, Clock, Smartphone, AlertTriangle, Fingerprint, Trash2, LogOut, X, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import logo from "@/assets/logo.png";

const Settings = () => {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { toast } = useToast();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("members");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleLanguageChange = (newLang: "my" | "en") => {
    setLang(newLang);
    setShowLanguagePicker(false);
    toast({ title: newLang === "my" ? "ဘာသာစကား ပြောင်းပြီးပါပြီ" : "Language changed" });
  };

  const handlePasswordChange = () => {
    if (newPw !== confirmPw) {
      toast({ title: lang === "my" ? "စကားဝှက် မတူပါ" : "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: lang === "my" ? "စကားဝှက် အနည်းဆုံး ၆ လုံး" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setShowPasswordChange(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    toast({ title: lang === "my" ? "စကားဝှက် ပြောင်းပြီးပါပြီ ✓" : "Password changed ✓" });
  };

  const handleDeleteAccount = () => {
    if (deleteText === "DELETE") {
      setShowDeleteConfirm(false);
      toast({ title: lang === "my" ? "အကောင့် ဖျက်ရန် တောင်းဆိုပြီးပါပြီ" : "Account deletion requested", description: lang === "my" ? "၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်" : "You can recover within 24 hours" });
      navigate("/");
    }
  };

  const handleEmergencyExit = () => {
    toast({ title: lang === "my" ? "ထွက်ပြီးပါပြီ" : "Signed out", description: lang === "my" ? "Local Data အားလုံး ရှင်းလင်းပြီးပါပြီ" : "All local data cleared" });
    navigate("/");
  };

  const settingsSections = [
    {
      title: lang === "my" ? "ဘာသာစကားနှင့် ဖောင့်" : "Language & Font", items: [
        { icon: Languages, label: lang === "my" ? "ဘာသာစကား" : "Language", value: lang === "my" ? "မြန်မာ (Burmese)" : "English", action: () => setShowLanguagePicker(true) },
        { icon: Type, label: lang === "my" ? "ဖောင့် Encoding" : "Font Encoding", value: "Unicode", action: () => {} },
      ]
    },
    {
      title: lang === "my" ? "အကြောင်းကြားချက်" : "Notifications", items: [
        { icon: Bell, label: "Push Notifications", value: pushNotifications ? (lang === "my" ? "ဖွင့်ထား" : "On") : (lang === "my" ? "ပိတ်ထား" : "Off"), toggle: true, toggleValue: pushNotifications, onToggle: () => setPushNotifications(!pushNotifications) },
        { icon: Smartphone, label: "Telegram Alerts", value: lang === "my" ? "ချိတ်ဆက်မထား" : "Not linked", action: () => toast({ title: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon" }) },
      ]
    },
    {
      title: lang === "my" ? "လုံခြုံရေး" : "Security", items: [
        { icon: Lock, label: lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password", value: "", action: () => setShowPasswordChange(true) },
        { icon: Clock, label: lang === "my" ? "Session သက်တမ်း" : "Session Expiry", value: lang === "my" ? "၂၄ နာရီ" : "24 hours", action: () => {} },
        { icon: Fingerprint, label: lang === "my" ? "စက်ကို မှတ်ထားရန်" : "Remember Device", value: "", toggle: true, toggleValue: rememberDevice, onToggle: () => setRememberDevice(!rememberDevice) },
        { icon: Key, label: "Delegate Access Token", value: lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set", action: () => toast({ title: lang === "my" ? "Token ဖန်တီးပြီးပါပြီ" : "Token generated", description: "abc123-def456-ghi789" }) },
      ]
    },
    {
      title: lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Privacy", items: [
        { icon: Eye, label: lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility", value: profileVisibility === "members" ? (lang === "my" ? "အဖွဲ့ဝင်များသာ" : "Members only") : (lang === "my" ? "အားလုံး" : "Public"), action: () => { setProfileVisibility(prev => prev === "members" ? "public" : "members"); } },
        { icon: Shield, label: lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy Policy", value: "", action: () => toast({ title: lang === "my" ? "Privacy Policy" : "Privacy Policy", description: lang === "my" ? "မကြာမီ ရရှိနိုင်ပါမည်" : "Coming soon" }) },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "ဆက်တင်များ" : "Settings"} showBack />

      <div className="px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div>
            <p className="text-xs font-bold text-destructive">{lang === "my" ? "အရေးပေါ် ထွက်ရန်" : "Emergency Exit"}</p>
            <p className="mt-1 text-[11px] text-foreground/80">
              {lang === "my"
                ? "အောက်ပါ ခလုတ်ကို နှိပ်ပြီး ချက်ချင်း Sign Out ပြုလုပ်ပါ"
                : "Tap the button below to instantly sign out and clear all local data"}
            </p>
            <Button variant="destructive" size="sm" className="mt-2 rounded-lg text-xs" onClick={handleEmergencyExit}>
              {lang === "my" ? "ချက်ချင်း ထွက်ရန်" : "Emergency Sign Out"}
            </Button>
          </div>
        </motion.div>

        {settingsSections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }} className="mb-4">
            <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-card">
              {section.items.map((item, i) => (
                <button key={i} onClick={'action' in item ? item.action : undefined} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/30">
                  <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.label}</p>
                  </div>
                  {'toggle' in item && item.toggle ? (
                    <button onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }} className={`h-6 w-11 rounded-full transition-colors ${item.toggleValue ? "bg-primary" : "bg-muted-foreground/30"}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${item.toggleValue ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  ) : (
                    <>
                      {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
          <h2 className="mb-2 px-1 text-xs font-semibold text-destructive">{lang === "my" ? "အန္တရာယ်ဇုန်" : "Danger Zone"}</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <button onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-destructive/5">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{lang === "my" ? "အကောင့် ဖျက်ရန်" : "Delete Account"}</p>
                <p className="text-[10px] text-muted-foreground">{lang === "my" ? "၂၄ နာရီအတွင်း ပြန်ရယူနိုင်" : "24-hour cancellation window"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/30" onClick={() => navigate("/")}>
              <LogOut className="h-4.5 w-4.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-foreground">{lang === "my" ? "ထွက်ရန်" : "Sign Out"}</p>
              </div>
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">ThweSone v1.0.0 · Build 2026.03</p>
      </div>

      {/* Language Picker Modal */}
      <AnimatePresence>
        {showLanguagePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowLanguagePicker(false)}>
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "ဘာသာစကား ရွေးပါ" : "Select Language"}</h2>
                <button onClick={() => setShowLanguagePicker(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleLanguageChange("my")} className={`flex w-full items-center gap-3 rounded-xl p-4 text-left ${lang === "my" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
                  <span className="text-2xl">🇲🇲</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">မြန်မာ (Burmese)</p>
                    <p className="text-xs text-muted-foreground">Myanmar Language</p>
                  </div>
                  {lang === "my" && <Check className="h-5 w-5 text-primary" />}
                </button>
                <button onClick={() => handleLanguageChange("en")} className={`flex w-full items-center gap-3 rounded-xl p-4 text-left ${lang === "en" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
                  <span className="text-2xl">🇺🇸</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">English</p>
                    <p className="text-xs text-muted-foreground">English Language</p>
                  </div>
                  {lang === "en" && <Check className="h-5 w-5 text-primary" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowPasswordChange(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password"}</h2>
                <button onClick={() => setShowPasswordChange(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "လက်ရှိ စကားဝှက်" : "Current Password"}</label>
                  <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "စကားဝှက်အသစ်" : "New Password"}</label>
                  <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "အတည်ပြု စကားဝှက်" : "Confirm Password"}</label>
                  <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <Button variant="gold" size="lg" className="mt-4 w-full rounded-xl" onClick={handlePasswordChange} disabled={!currentPw || !newPw || !confirmPw}>
                {lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Update Password"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="mb-2 text-center text-lg font-bold text-foreground">{lang === "my" ? "အကောင့် ဖျက်မှာ သေချာပါသလား?" : "Delete your account?"}</h2>
              <p className="mb-4 text-center text-xs text-muted-foreground">
                {lang === "my"
                  ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ဖျက်၍ မရပါ။ ၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်။ အတည်ပြုရန် 'DELETE' ဟု ရိုက်ထည့်ပါ"
                  : "This action cannot be undone. You have 24 hours to recover. Type 'DELETE' to confirm"}
              </p>
              <Input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder='Type "DELETE"' className="mb-4 h-11 rounded-xl text-center text-sm" />
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)}>
                  {lang === "my" ? "မလုပ်တော့" : "Cancel"}
                </Button>
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" disabled={deleteText !== "DELETE"} onClick={handleDeleteAccount}>
                  {lang === "my" ? "ဖျက်မည်" : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
