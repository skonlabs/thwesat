import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type, Shield, Bell, Lock, Key, ChevronRight,
  Languages, Eye, Clock, Smartphone, AlertTriangle, Fingerprint, Trash2, LogOut, X, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import SettingsBottomSheet from "@/components/settings/SettingsBottomSheet";
import ProfileVisibilitySheet from "@/components/settings/ProfileVisibilitySheet";
import SessionExpirySheet from "@/components/settings/SessionExpirySheet";
import TelegramLinkSheet from "@/components/settings/TelegramLinkSheet";
import DelegateTokenSheet from "@/components/settings/DelegateTokenSheet";
import FontEncodingSheet from "@/components/settings/FontEncodingSheet";
import PrivacyPolicySheet from "@/components/settings/PrivacyPolicySheet";

const Settings = () => {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { toast } = useToast();

  // Toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(false);

  // Values
  const [profileVisibility, setProfileVisibility] = useState("members");
  const [sessionExpiry, setSessionExpiry] = useState("24h");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [delegateToken, setDelegateToken] = useState<string | null>(null);

  // Sheet states
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);
  const [showSessionExpiry, setShowSessionExpiry] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showFontEncoding, setShowFontEncoding] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [deleteText, setDeleteText] = useState("");

  const sessionLabels: Record<string, { my: string; en: string }> = {
    "1h": { my: "၁ နာရီ", en: "1 hour" },
    "24h": { my: "၂၄ နာရီ", en: "24 hours" },
    "7d": { my: "၇ ရက်", en: "7 days" },
    "30d": { my: "၃၀ ရက်", en: "30 days" },
  };

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
      toast({
        title: lang === "my" ? "အကောင့် ဖျက်ရန် တောင်းဆိုပြီးပါပြီ" : "Account deletion requested",
        description: lang === "my" ? "၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်" : "You can recover within 24 hours",
      });
      navigate("/");
    }
  };

  const handleEmergencyExit = () => {
    toast({
      title: lang === "my" ? "ထွက်ပြီးပါပြီ" : "Signed out",
      description: lang === "my" ? "Local Data အားလုံး ရှင်းလင်းပြီးပါပြီ" : "All local data cleared",
    });
    navigate("/");
  };

  const generateToken = () => {
    const token = `ts_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    setDelegateToken(token);
    toast({ title: lang === "my" ? "Token ဖန်တီးပြီးပါပြီ" : "Token generated" });
  };

  const visibilityLabels: Record<string, { my: string; en: string }> = {
    members: { my: "အဖွဲ့ဝင်များသာ", en: "Members only" },
    public: { my: "အားလုံး", en: "Public" },
    private: { my: "ကိုယ်တိုင်သာ", en: "Private" },
  };

  const settingsSections = [
    {
      title: lang === "my" ? "ဘာသာစကားနှင့် ဖောင့်" : "Language & Font",
      items: [
        { icon: Languages, label: lang === "my" ? "ဘာသာစကား" : "Language", value: lang === "my" ? "မြန်မာ" : "English", action: () => setShowLanguagePicker(true) },
        { icon: Type, label: lang === "my" ? "ဖောင့် Encoding" : "Font Encoding", value: "Unicode", action: () => setShowFontEncoding(true) },
      ],
    },
    {
      title: lang === "my" ? "အကြောင်းကြားချက်" : "Notifications",
      items: [
        { icon: Bell, label: lang === "my" ? "Push အကြောင်းကြားချက်" : "Push Notifications", toggle: true, toggleValue: pushNotifications, onToggle: () => setPushNotifications(!pushNotifications) },
        { icon: Smartphone, label: lang === "my" ? "Telegram သတိပေးချက်" : "Telegram Alerts", value: telegramLinked ? (lang === "my" ? "ချိတ်ဆက်ပြီး" : "Linked") : (lang === "my" ? "ချိတ်ဆက်မထား" : "Not linked"), action: () => setShowTelegram(true) },
      ],
    },
    {
      title: lang === "my" ? "လုံခြုံရေး" : "Security",
      items: [
        { icon: Lock, label: lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password", value: "", action: () => setShowPasswordChange(true) },
        { icon: Clock, label: lang === "my" ? "Session သက်တမ်း" : "Session Expiry", value: sessionLabels[sessionExpiry]?.[lang] || "24 hours", action: () => setShowSessionExpiry(true) },
        { icon: Fingerprint, label: lang === "my" ? "စက်ကို မှတ်ထားရန်" : "Remember Device", toggle: true, toggleValue: rememberDevice, onToggle: () => setRememberDevice(!rememberDevice) },
        { icon: Key, label: lang === "my" ? "ကိုယ်စားလှယ် Token" : "Delegate Access Token", value: delegateToken ? (lang === "my" ? "သတ်မှတ်ပြီး" : "Active") : (lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set"), action: () => setShowToken(true) },
      ],
    },
    {
      title: lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Privacy",
      items: [
        { icon: Eye, label: lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility", value: visibilityLabels[profileVisibility]?.[lang] || "Members only", action: () => setShowVisibility(true) },
        { icon: Shield, label: lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy Policy", value: "", action: () => setShowPrivacyPolicy(true) },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title={lang === "my" ? "ဆက်တင်များ" : "Settings"} />

      <div className="px-5">
        {/* Emergency Exit Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" strokeWidth={1.5} />
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

        {/* Settings Sections */}
        {settingsSections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }} className="mb-4">
            <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {section.items.map((item, i) => (
                <button
                  key={i}
                  onClick={'action' in item ? item.action : undefined}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/30"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.label}</p>
                  </div>
                  {'toggle' in item && item.toggle ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }}
                      className={`h-6 w-11 rounded-full transition-colors ${item.toggleValue ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-card shadow transition-transform ${item.toggleValue ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  ) : (
                    <>
                      {'value' in item && item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
          <h2 className="mb-2 px-1 text-xs font-semibold text-destructive">{lang === "my" ? "အန္တရာယ်ဇုန်" : "Danger Zone"}</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-destructive/5">
              <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-destructive">{lang === "my" ? "အကောင့် ဖျက်ရန်" : "Delete Account"}</p>
                <p className="text-[10px] text-muted-foreground">{lang === "my" ? "၂၄ နာရီအတွင်း ပြန်ရယူနိုင်" : "24-hour cancellation window"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/30" onClick={() => navigate("/")}>
              <LogOut className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{lang === "my" ? "ထွက်ရန်" : "Sign Out"}</p>
              </div>
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">ThweSone v1.0.0 · Build 2026.03</p>
      </div>

      {/* === Bottom Sheet Modals === */}

      {/* Language Picker */}
      <SettingsBottomSheet open={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} title={lang === "my" ? "ဘာသာစကား ရွေးပါ" : "Select Language"}>
        <div className="space-y-2">
          {[
            { code: "my" as const, flag: "🇲🇲", name: "မြန်မာ (Burmese)", sub: "Myanmar Language" },
            { code: "en" as const, flag: "🇺🇸", name: "English", sub: "English Language" },
          ].map((opt) => (
            <button
              key={opt.code}
              onClick={() => handleLanguageChange(opt.code)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                lang === opt.code ? "border-primary bg-primary/10" : "border-border bg-card active:bg-muted"
              }`}
            >
              <span className="text-2xl">{opt.flag}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{opt.name}</p>
                <p className="text-xs text-muted-foreground">{opt.sub}</p>
              </div>
              {lang === opt.code && <Check className="h-5 w-5 text-primary" strokeWidth={1.5} />}
            </button>
          ))}
        </div>
      </SettingsBottomSheet>

      {/* Change Password */}
      <SettingsBottomSheet open={showPasswordChange} onClose={() => setShowPasswordChange(false)} title={lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password"}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "လက်ရှိ စကားဝှက်" : "Current Password"}</label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "စကားဝှက်အသစ်" : "New Password"}</label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{lang === "my" ? "အတည်ပြု စကားဝှက်" : "Confirm Password"}</label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-11 rounded-xl" />
          </div>
          {newPw && newPw.length < 6 && (
            <p className="text-[11px] text-destructive">
              {lang === "my" ? "စကားဝှက် အနည်းဆုံး ၆ လုံး ရှိရပါမည်" : "Password must be at least 6 characters"}
            </p>
          )}
          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-[11px] text-destructive">
              {lang === "my" ? "စကားဝှက် မတူပါ" : "Passwords don't match"}
            </p>
          )}
        </div>
        <Button variant="gold" size="lg" className="mt-4 w-full rounded-xl" onClick={handlePasswordChange} disabled={!currentPw || !newPw || !confirmPw}>
          {lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Update Password"}
        </Button>
      </SettingsBottomSheet>

      {/* Feature Sheets */}
      <ProfileVisibilitySheet open={showVisibility} onClose={() => setShowVisibility(false)} value={profileVisibility} onChange={setProfileVisibility} />
      <SessionExpirySheet open={showSessionExpiry} onClose={() => setShowSessionExpiry(false)} value={sessionExpiry} onChange={setSessionExpiry} />
      <TelegramLinkSheet
        open={showTelegram}
        onClose={() => setShowTelegram(false)}
        isLinked={telegramLinked}
        onLink={() => { setTelegramLinked(true); toast({ title: lang === "my" ? "Telegram ချိတ်ဆက်ပြီးပါပြီ" : "Telegram linked!" }); }}
        onUnlink={() => { setTelegramLinked(false); toast({ title: lang === "my" ? "Telegram ချိတ်ဆက်မှု ဖြုတ်ပြီးပါပြီ" : "Telegram unlinked" }); }}
      />
      <DelegateTokenSheet
        open={showToken}
        onClose={() => setShowToken(false)}
        token={delegateToken}
        onGenerate={generateToken}
        onRevoke={() => { setDelegateToken(null); toast({ title: lang === "my" ? "Token ဖျက်သိမ်းပြီးပါပြီ" : "Token revoked" }); }}
      />
      <FontEncodingSheet open={showFontEncoding} onClose={() => setShowFontEncoding(false)} />
      <PrivacyPolicySheet open={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 text-center text-lg font-bold text-foreground">{lang === "my" ? "အကောင့် ဖျက်မှာ သေချာပါသလား?" : "Delete your account?"}</h2>
              <p className="mb-4 text-center text-xs text-muted-foreground">
                {lang === "my"
                  ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ဖျက်၍ မရပါ။ ၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်။ အတည်ပြုရန် 'DELETE' ဟု ရိုက်ထည့်ပါ"
                  : "This action cannot be undone. You have 24 hours to recover. Type 'DELETE' to confirm"}
              </p>
              <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder='Type "DELETE"' className="mb-4 h-11 rounded-xl text-center text-sm" />
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
