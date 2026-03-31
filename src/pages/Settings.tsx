import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, Type, Shield, Bell, Lock, UserX, Key, ChevronRight,
  Languages, Eye, Clock, Smartphone, AlertTriangle, Fingerprint, Trash2, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import logo from "@/assets/logo.png";

const Settings = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const settingsSections = [
    {
      title: lang === "my" ? "ဘာသာစကားနှင့် ဖောင့်" : "Language & Font", items: [
        { icon: Languages, label: lang === "my" ? "ဘာသာစကား" : "Language", value: lang === "my" ? "မြန်မာ (Burmese)" : "English", path: "" },
        { icon: Type, label: lang === "my" ? "ဖောင့် Encoding" : "Font Encoding", value: "Unicode", path: "" },
      ]
    },
    {
      title: lang === "my" ? "အကြောင်းကြားချက်" : "Notifications", items: [
        { icon: Bell, label: "Push Notifications", value: lang === "my" ? "ဖွင့်ထား" : "On", path: "" },
        { icon: Smartphone, label: "Telegram Alerts", value: lang === "my" ? "ချိတ်ဆက်မထား" : "Not linked", path: "" },
      ]
    },
    {
      title: lang === "my" ? "လုံခြုံရေး" : "Security", items: [
        { icon: Lock, label: lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password", value: "", path: "" },
        { icon: Clock, label: lang === "my" ? "Session သက်တမ်း" : "Session Expiry", value: lang === "my" ? "၂၄ နာရီ" : "24 hours", path: "" },
        { icon: Fingerprint, label: lang === "my" ? "စက်ကို မှတ်ထားရန်" : "Remember Device", value: lang === "my" ? "ပိတ်ထား" : "Off", path: "" },
        { icon: Key, label: "Delegate Access Token", value: lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set", path: "" },
      ]
    },
    {
      title: lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Privacy", items: [
        { icon: Eye, label: lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility", value: lang === "my" ? "အဖွဲ့ဝင်များသာ" : "Members only", path: "" },
        { icon: Shield, label: lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy Policy", value: "", path: "" },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "ဆက်တင်များ" : "Settings"}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div>
            <p className="text-xs font-bold text-destructive">{lang === "my" ? "အရေးပေါ် ထွက်ရန်" : "Emergency Exit"}</p>
            <p className="mt-1 text-[11px] text-foreground/80">
              {lang === "my"
                ? "Logo ကို ၃ စက္ကန့် ဖိထားပါ - ချက်ချင်း Sign Out ပြုလုပ်ပြီး Local Data အားလုံး ရှင်းလင်းပါမည်"
                : "Hold the logo for 3 seconds to instantly sign out and clear all local data"}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-5 rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <Key className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Delegate Access Token</p>
              <p className="mt-1 text-[11px] text-foreground/80">
                {lang === "my"
                  ? "ယုံကြည်ရသော သူတစ်ဦးအား သင့်အကောင့်ကို ကိုယ်စားစီမံခွင့် ပေးနိုင်ပါသည်"
                  : "Grant a trusted person limited access to manage your account on your behalf"}
              </p>
              <Button variant="outline" size="sm" className="mt-2 rounded-lg text-xs">
                {lang === "my" ? "Token ဖန်တီးရန်" : "Generate Token"}
              </Button>
            </div>
          </div>
        </motion.div>

        {settingsSections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }} className="mb-4">
            <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-card">
              {section.items.map((item, i) => (
                <button key={i} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/30">
                  <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.label}</p>
                  </div>
                  {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
          <h2 className="mb-2 px-1 text-xs font-semibold text-destructive">{lang === "my" ? "အန္တရာယ်ဇုန်" : "Danger Zone"}</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <button className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-destructive/5">
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
    </div>
  );
};

export default Settings;
