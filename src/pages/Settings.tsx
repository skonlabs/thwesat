import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type, Shield, Bell, Lock, Key, ChevronRight, Receipt,
  Languages, Eye, Clock, Smartphone, AlertTriangle, Fingerprint, Trash2, LogOut, X, Check, Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useActiveDelegateToken, useGenerateDelegateToken, useRevokeDelegateToken } from "@/hooks/use-delegate-token";
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
  const { signOut, user } = useAuth();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: activeToken } = useActiveDelegateToken();
  const generateTokenMutation = useGenerateDelegateToken();
  const revokeTokenMutation = useRevokeDelegateToken();

  // Toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(() => {
    // Persist email notification preference in localStorage until backend is wired.
    return localStorage.getItem("email_notifications_enabled") !== "false";
  });

  // Values
  const [profileVisibility, setProfileVisibility] = useState("members");
  const [sessionExpiry, setSessionExpiry] = useState("24h");
  const [telegramLinked, setTelegramLinked] = useState(false);

  // Hydrate from server-stored settings
  useEffect(() => {
    if (!settings) return;
    setPushNotifications(settings.push_notifications);
    setRememberDevice(settings.remember_device);
    setProfileVisibility(settings.profile_visibility);
    setSessionExpiry(settings.session_expiry);
    setTelegramLinked(settings.telegram_linked);
  }, [settings]);

  const persist = (patch: Record<string, unknown>) => {
    updateSettings.mutate(patch as any);
  };

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
  const [deletePassword, setDeletePassword] = useState("");
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);

  // Grace period (days) before profile is purged
  const DELETION_GRACE_DAYS = 14;

  // Hydrate pending-deletion state and auto-cancel if scheduled date already passed
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("deletion_scheduled_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setDeletionScheduledAt((data as { deletion_scheduled_at: string | null } | null)?.deletion_scheduled_at ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const cancelPendingDeletion = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("profiles")
      .update({ deletion_scheduled_at: null, deletion_requested_at: null })
      .eq("id", user.id);
    if (error) {
      toast({ title: lang === "my" ? "ပယ်ဖျက်၍ မရပါ" : "Could not cancel", variant: "destructive" });
      return;
    }
    setDeletionScheduledAt(null);
  };

  const sessionLabels: Record<string, { my: string; en: string }> = {
    "1h": { my: "၁ နာရီ", en: "1 hour" },
    "24h": { my: "၂၄ နာရီ", en: "24 hours" },
    "7d": { my: "၇ ရက်", en: "7 days" },
    "30d": { my: "၃၀ ရက်", en: "30 days" },
  };

  const handleLanguageChange = (newLang: "my" | "en") => {
    setLang(newLang);
    persist({ language: newLang });
    setShowLanguagePicker(false);
  };

  const handlePasswordChange = async () => {
    if (!currentPw) {
      toast({ title: lang === "my" ? "လက်ရှိ စကားဝှက် လိုအပ်သည်" : "Current password required", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: lang === "my" ? "စကားဝှက် မတူပါ" : "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: lang === "my" ? "စကားဝှက် အနည်းဆုံး ၆ လုံး" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (currentPw === newPw) {
      toast({ title: lang === "my" ? "စကားဝှက်အသစ်သည် ယခင်နှင့် မတူရပါ" : "New password must differ from current", variant: "destructive" });
      return;
    }
    if (!user?.email) {
      toast({ title: lang === "my" ? "အီးမေးလ် မတွေ့ပါ" : "Email not found", variant: "destructive" });
      return;
    }
    // Re-authenticate with current password before allowing change
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (reauthError) {
      toast({ title: lang === "my" ? "လက်ရှိ စကားဝှက် မှားနေပါသည်" : "Current password is incorrect", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    setShowPasswordChange(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    // Sign out after password change to invalidate all existing sessions.
    // The user is redirected to login with an informational message.
    await supabase.auth.signOut();
    navigate("/login", { state: { message: lang === "my" ? "စကားဝှက် ပြောင်းပြီး။ ထပ်မံ Sign In ပြုလုပ်ပါ။" : "Password changed. Please sign in again." } });
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    if (!user?.email) {
      toast({ title: lang === "my" ? "အီးမေးလ် မတွေ့ပါ" : "Email not found", variant: "destructive" });
      return;
    }
    // Require password re-auth before destructive scrub
    if (!deletePassword) {
      toast({ title: lang === "my" ? "စကားဝှက် ထည့်ပါ" : "Enter your password to confirm", variant: "destructive" });
      return;
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });
    if (reauthError) {
      toast({ title: lang === "my" ? "စကားဝှက် မှားနေပါသည်" : "Password incorrect", variant: "destructive" });
      return;
    }
    // Issue #41: wrap the two update calls with error handling and retry logic.
    // Step 1 — schedule deletion on the profiles row.
    const scheduledAt = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: scheduleError } = await supabase.from("profiles").update({
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_at: scheduledAt,
    }).eq("id", user.id);
    if (scheduleError) {
      toast({ title: lang === "my" ? "မအောင်မြင်ပါ" : "Could not schedule deletion", variant: "destructive" });
      return;
    }

    // Step 2 — sign out. If this fails, retry once before surfacing a partial-error message.
    setShowDeleteConfirm(false);
    setDeleteText("");
    setDeletePassword("");
    let signOutError = null;
    try {
      const { error } = await supabase.auth.signOut();
      signOutError = error;
    } catch (e) {
      signOutError = e;
    }
    if (signOutError) {
      // Retry once
      try {
        await supabase.auth.signOut();
        signOutError = null;
      } catch {
        // ignore retry error — fall through to partial error message
      }
    }
    if (signOutError) {
      toast({
        title: lang === "my"
          ? "တစ်စိတ်တစ်ဒေသ အမှား — ကျေးဇူးပြု၍ Support ကို ဆက်သွယ်ပါ"
          : "Partial error — please contact support.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: lang === "my"
        ? "အကောင့်ကို ဖျက်ရန် စီစဉ်ပြီး။ Sign Out ပြုလုပ်ပြီးပါပြီ။"
        : "Your account is scheduled for deletion. You have been signed out.",
    });
    navigate("/");
  };

  const handleEmergencyExit = async () => {
    await signOut();
    navigate("/");
  };

  const generateToken = () => {
    generateTokenMutation.mutate(undefined, {
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to generate token";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  const revokeToken = () => {
    if (!activeToken) return;
    revokeTokenMutation.mutate(activeToken.id, {
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to revoke token";
        toast({ title: msg, variant: "destructive" });
      },
    });
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
        { icon: Type, label: lang === "my" ? "ဖောင့် ကုဒ်စနစ်" : "Font Encoding", value: ({ system: lang === "my" ? "မူရင်း" : "System", pyidaungsu: "Pyidaungsu", noto: "Noto Sans" } as Record<string, string>)[settings?.font_encoding || "system"] || "System", action: () => setShowFontEncoding(true) },
      ],
    },
    {
      title: lang === "my" ? "အကြောင်းကြားချက်" : "Notifications",
      items: [
        // Push toggle is wired to user_settings but the browser Push API + service worker
        // dispatcher is not built yet. Keep it visible so the preference is captured for
        // when delivery ships, but make it clear via toast if the user expects immediate effect.
        { icon: Bell, label: lang === "my" ? "တွန်းအကြောင်းကြားချက်" : "Push Notifications", toggle: true, toggleValue: pushNotifications, onToggle: () => {
          const v = !pushNotifications; setPushNotifications(v); persist({ push_notifications: v });
          if (v) toast({ title: lang === "my" ? "မကြာမီ ရရှိမည်" : "Coming soon", description: lang === "my" ? "ဘရောင်ဇာ Push အကြောင်းကြားချက် မထွက်ရှိသေးပါ။ ယခုအချိန်တွင် Telegram သို့မဟုတ် အီးမေးလ်မှသာ အကြောင်းကြားမည်။" : "Browser push delivery isn't shipped yet. Notifications will continue via Telegram and email." });
        } },
        { icon: Mail, label: lang === "my" ? "အီးမေးလ် အကြောင်းကြားချက်" : "Email Notifications", description: lang === "my" ? "လျှောက်လွှာ / မက်ဆေ့ချ် / ဘွတ်ကင် ရရှိသောအခါ အီးမေးလ် ပို့ပါ" : "Email me for new applications, messages & bookings", toggle: true, toggleValue: emailNotifications, onToggle: () => {
          const v = !emailNotifications; setEmailNotifications(v);
          localStorage.setItem("email_notifications_enabled", String(v));
          persist({ email_notifications: v } as any);
        } },
        // Telegram toggle is Coming soon — disabled with a badge indicator.
        { icon: Smartphone, label: lang === "my" ? "တယ်လီဂရမ် သတိပေးချက်" : "Telegram Alerts", value: lang === "my" ? "မကြာမီ ရရှိမည်" : "Coming soon", disabled: true, action: () => {} },
      ],
    },
    {
      title: lang === "my" ? "လုံခြုံရေး" : "Security",
      items: [
        { icon: Lock, label: lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Change Password", value: "", action: () => setShowPasswordChange(true) },
        { icon: Clock, label: lang === "my" ? "အကောင့် သက်တမ်း" : "Session Expiry", value: sessionLabels[sessionExpiry]?.[lang] || "24 hours", action: () => setShowSessionExpiry(true) },
        { icon: Fingerprint, label: lang === "my" ? "စက်ကို မှတ်ထားရန်" : "Remember Device", toggle: true, toggleValue: rememberDevice, onToggle: () => {
          const v = !rememberDevice; setRememberDevice(v); persist({ remember_device: v });
        } },
        { icon: Key, label: lang === "my" ? "ကိုယ်စားလှယ် ဝင်ရောက်ခွင့်" : "Delegate Access Token", value: activeToken ? (lang === "my" ? "သတ်မှတ်ပြီး" : "Active") : (lang === "my" ? "မသတ်မှတ်ရသေး" : "Not set"), action: () => setShowToken(true) },
      ],
    },
    {
      title: lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Privacy",
      items: [
        { icon: Eye, label: lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility", value: visibilityLabels[profileVisibility]?.[lang] || "Members only", action: () => setShowVisibility(true) },
        { icon: Shield, label: lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု" : "Privacy Policy", value: "", action: () => setShowPrivacyPolicy(true) },
      ],
    },
    {
      title: lang === "my" ? "ငွေပေးချေမှု" : "Billing",
      items: [
        { icon: Receipt, label: lang === "my" ? "ငွေပေးချေမှု မှတ်တမ်း" : "Payment History", value: "", action: () => navigate("/payments/history") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ဆက်တင်များ" : "Settings"} showBack />

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
                  onClick={!('disabled' in item && item.disabled) && 'action' in item ? item.action : undefined}
                  disabled={'disabled' in item && !!item.disabled && !('toggle' in item && item.toggle)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground">{item.label}</p>
                      {'disabled' in item && item.disabled && !('toggle' in item && item.toggle) && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {lang === "my" ? "မကြာမီ" : "Coming soon"}
                        </span>
                      )}
                    </div>
                    {'description' in item && item.description && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{item.description}</p>
                    )}
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
                      {!('disabled' in item && item.disabled) && <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                    </>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Security note — active sessions & delegate token permissions notice (issue #57) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-4 space-y-2">
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[11px] text-muted-foreground">
              {lang === "my"
                ? "စကားဝှက် ပြောင်းလဲခြင်းသည် စက်အားလုံးကို Sign Out ပြုလုပ်ပါမည်။"
                : "For security, changing your password signs out all devices."}
            </p>
          </div>
          {activeToken && (
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
              <Key className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-foreground mb-1">
                  {lang === "my" ? "Delegate Token ခွင့်ပြုချက်များ" : "Delegate token permissions"}
                </p>
                {activeToken.permissions && activeToken.permissions.length > 0 ? (
                  <ul className="space-y-0.5">
                    {activeToken.permissions.map((perm) => {
                      const permissionLabels: Record<string, { en: string; my: string }> = {
                        read_profile:   { en: "View your profile",          my: "သင့်ပရိုဖိုင် ကြည့်ရှုခွင့်" },
                        read_jobs:      { en: "View your job applications",  my: "အလုပ်လျှောက်ထားမှုများ ကြည့်ရှုခွင့်" },
                        profile_edit:   { en: "Edit your profile",           my: "သင့်ပရိုဖိုင် ပြင်ဆင်ခွင့်" },
                        read_messages:  { en: "Read your messages",          my: "မက်ဆေ့ချ်များ ဖတ်ရှုခွင့်" },
                        send_messages:  { en: "Send messages on your behalf",my: "မက်ဆေ့ချ် ပေးပို့ခွင့်" },
                        manage_bookings:{ en: "Manage your bookings",        my: "ချိန်းဆိုမှုများ စီမံခန့်ခွဲခွင့်" },
                      };
                      const label = permissionLabels[perm];
                      return (
                        <li key={perm} className="text-[11px] text-muted-foreground">
                          • {label ? (lang === "my" ? label.my : label.en) : perm}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "my"
                      ? "Delegate Token များသည် ယခုအချိန်တွင် ဖတ်ရှုရုံသာ ဝင်ရောက်ခွင့် ရရှိမည်ဖြစ်သည်။"
                      : "Delegate tokens currently provide read-only access."}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
          <h2 className="mb-2 px-1 text-xs font-semibold text-destructive">{lang === "my" ? "အန္တရာယ်ဇုန်" : "Danger Zone"}</h2>

          {deletionScheduledAt && (() => {
            const days = Math.max(0, Math.ceil((new Date(deletionScheduledAt).getTime() - Date.now()) / 86400000));
            const dateLabel = new Date(deletionScheduledAt).toLocaleDateString();
            return (
              <div className="mb-3 overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="mb-2 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">
                      {lang === "my" ? "အကောင့်ဖျက်ရန် စီစဉ်ထားသည်" : "Account deletion scheduled"}
                    </p>
                    <p className="mt-1 text-[11px] text-foreground/80">
                      {lang === "my"
                        ? `${dateLabel} (${days} ရက်အတွင်း) တွင် ပရိုဖိုင်အချက်အလက်များကို အပြီးအပိုင် ဖျက်ပါမည်။`
                        : `Your profile data will be permanently scrubbed on ${dateLabel} (${days} day${days === 1 ? "" : "s"} left).`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={cancelPendingDeletion}>
                  {lang === "my" ? "ဖျက်ခြင်းကို ပယ်ဖျက်" : "Cancel deletion"}
                </Button>
              </div>
            );
          })()}

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button onClick={() => setShowDeleteConfirm(true)} disabled={!!deletionScheduledAt} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-destructive/5 disabled:opacity-50">
              <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-destructive">{lang === "my" ? "အကောင့် ဖျက်ရန်" : "Delete Account"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "my"
                    ? `${DELETION_GRACE_DAYS} ရက် Grace period ပြီးမှ အပြီးအပိုင် ဖျက်ပါမည်`
                    : `Schedules deletion in ${DELETION_GRACE_DAYS} days; cancel anytime before then`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/30" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{lang === "my" ? "ထွက်ရန်" : "Sign Out"}</p>
              </div>
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">ThweSat v1.0.0 · Build 2026.03</p>
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
                lang === opt.code ? "border-primary bg-primary/10" : "border-border bg-card active:bg-muted/50"
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
        <Button variant="default" size="lg" className="mt-4 w-full rounded-xl" onClick={handlePasswordChange} disabled={!currentPw || !newPw || !confirmPw}>
          {lang === "my" ? "စကားဝှက် ပြောင်းရန်" : "Update Password"}
        </Button>
      </SettingsBottomSheet>

      {/* Feature Sheets */}
      <ProfileVisibilitySheet open={showVisibility} onClose={() => setShowVisibility(false)} value={profileVisibility} onChange={(v) => { setProfileVisibility(v); persist({ profile_visibility: v }); }} />
      <SessionExpirySheet open={showSessionExpiry} onClose={() => setShowSessionExpiry(false)} value={sessionExpiry} onChange={(v) => { setSessionExpiry(v); persist({ session_expiry: v }); }} />
      <TelegramLinkSheet
        open={showTelegram}
        onClose={() => setShowTelegram(false)}
        isLinked={telegramLinked}
        onLink={() => { setTelegramLinked(true); persist({ telegram_linked: true }); }}
        onUnlink={() => { setTelegramLinked(false); persist({ telegram_linked: false, telegram_chat_id: null, telegram_username: null }); }}
      />
      <DelegateTokenSheet
        open={showToken}
        onClose={() => setShowToken(false)}
        token={activeToken?.token ?? null}
        onGenerate={generateToken}
        onRevoke={revokeToken}
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
                  ? `${DELETION_GRACE_DAYS} ရက် Grace period ပြီးမှ ပရိုဖိုင်အချက်အလက်များ (အမည်၊ ကိုယ်ရေး၊ ဆက်သွယ်ရန်၊ avatar) ကို အပြီးအပိုင် ဖျက်ပါမည်။ ထိုကာလအတွင်း ပြန်ဝင်၍ ပယ်ဖျက်နိုင်ပါသည်။ Auth အကောင့်ကို အပြည့်အ၀ ဖျက်ရန် Support သို့ ဆက်သွယ်ပါ။ အတည်ပြုရန် 'DELETE' ဟု ရိုက်ထည့်ပါ`
                  : `Your profile data (name, bio, contact, avatar) will be scheduled for permanent removal in ${DELETION_GRACE_DAYS} days. You can sign back in any time before then to cancel. Auth account removal still requires Support. Type 'DELETE' to confirm.`}
              </p>
              <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder='Type "DELETE"' className="mb-3 h-11 rounded-xl text-center text-sm" />
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={lang === "my" ? "လက်ရှိ စကားဝှက်" : "Current password"}
                className="mb-4 h-11 rounded-xl text-sm"
              />
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteText(""); }}>
                  {lang === "my" ? "မလုပ်တော့" : "Cancel"}
                </Button>
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" disabled={deleteText !== "DELETE" || !deletePassword} onClick={handleDeleteAccount}>
                  {lang === "my" ? "ဖျက်ရန် စီစဉ်" : "Schedule deletion"}
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
