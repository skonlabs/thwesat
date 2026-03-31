import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, Type, Shield, Bell, Lock, UserX, Key, ChevronRight,
  Languages, Eye, Clock, Smartphone, AlertTriangle, Fingerprint, Trash2, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const settingsSections = [
  {
    title: "ဘာသာစကားနှင့် ဖောင့် · Language & Font", items: [
      { icon: Languages, label: "ဘာသာစကား", labelEn: "Language", value: "မြန်မာ (Burmese)", path: "" },
      { icon: Type, label: "ဖောင့် Encoding", labelEn: "Font Encoding", value: "Unicode", path: "" },
    ]
  },
  {
    title: "အကြောင်းကြားချက် · Notifications", items: [
      { icon: Bell, label: "Push Notifications", labelEn: "Push Notifications", value: "On", path: "" },
      { icon: Smartphone, label: "Telegram Alerts", labelEn: "Telegram Job Alerts", value: "Not linked", path: "" },
    ]
  },
  {
    title: "လုံခြုံရေး · Security", items: [
      { icon: Lock, label: "စကားဝှက် ပြောင်းရန်", labelEn: "Change Password", value: "", path: "" },
      { icon: Clock, label: "Session သက်တမ်း", labelEn: "Session Expiry", value: "24 hours", path: "" },
      { icon: Fingerprint, label: "စက်ကို မှတ်ထားရန်", labelEn: "Remember Device", value: "Off", path: "" },
      { icon: Key, label: "Delegate Access", labelEn: "Delegate Access Token", value: "Not set", path: "" },
    ]
  },
  {
    title: "ကိုယ်ရေးအချက်အလက် · Privacy", items: [
      { icon: Eye, label: "ပရိုဖိုင် မြင်နိုင်မှု", labelEn: "Profile Visibility", value: "Members only", path: "" },
      { icon: Shield, label: "ကိုယ်ရေးကာကွယ်မှု", labelEn: "Privacy Policy", value: "", path: "" },
    ]
  },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">ဆက်တင်များ · Settings</h1>
        </div>

        {/* Panic button info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/5 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div>
            <p className="text-xs font-bold text-destructive">အရေးပေါ် ထွက်ရန် · Emergency Exit</p>
            <p className="mt-1 text-[11px] text-foreground/80">
              Logo ကို ၃ စက္ကန့် ဖိထားပါ - ချက်ချင်း Sign Out ပြုလုပ်ပြီး Local Data အားလုံး ရှင်းလင်းပါမည်
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Hold the logo for 3 seconds to instantly sign out and clear all local data
            </p>
          </div>
        </motion.div>

        {/* Delegate Access info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-5 rounded-2xl bg-card p-4 shadow-card"
        >
          <div className="flex items-start gap-3">
            <Key className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Delegate Access Token</p>
              <p className="mt-1 text-[11px] text-foreground/80">
                ယုံကြည်ရသော သူတစ်ဦးအား သင့်အကောင့်ကို ကိုယ်စားစီမံခွင့် ပေးနိုင်ပါသည်
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Grant a trusted person limited access to manage your account on your behalf
              </p>
              <Button variant="outline" size="sm" className="mt-2 rounded-lg text-xs">
                Token ဖန်တီးရန် · Generate Token
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Settings sections */}
        {settingsSections.map((section, si) => (
          <motion.div
            key={si}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.05 }}
            className="mb-4"
          >
            <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{section.title}</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-card">
              {section.items.map((item, i) => (
                <button key={i} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/30">
                  <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.labelEn}</p>
                  </div>
                  {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          <h2 className="mb-2 px-1 text-xs font-semibold text-destructive">အန္တရာယ်ဇုန် · Danger Zone</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <button className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-destructive/5">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-destructive">အကောင့် ဖျက်ရန်</p>
                <p className="text-[10px] text-muted-foreground">Delete Account · 24-hour cancellation window</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/30" onClick={() => navigate("/")}>
              <LogOut className="h-4.5 w-4.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-foreground">ထွက်ရန်</p>
                <p className="text-[10px] text-muted-foreground">Sign Out</p>
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
