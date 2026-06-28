import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Save, CalendarClock, Settings2, CheckCircle2, PauseCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvailabilityManager from "@/components/mentor/AvailabilityManager";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC", "Asia/Yangon", "Asia/Bangkok", "Asia/Kuala_Lumpur",
  "Asia/Singapore", "Asia/Tokyo", "Europe/London",
  "America/New_York", "America/Los_Angeles",
];

const SPOKEN_LANGUAGES = [
  "Burmese (Myanmar)", "English", "Thai", "Malay", "Japanese", "Korean",
  "Chinese (Mandarin)", "Chinese (Cantonese)", "Hindi", "Arabic", "French",
  "German", "Spanish", "Vietnamese", "Indonesian", "Tagalog", "Bengali",
  "Nepali", "Shan", "Karen", "Kachin", "Mon", "Chin",
];

const DAYS = [
  { day: "Mon", my: "တနင်္လာ" }, { day: "Tue", my: "အင်္ဂါ" }, { day: "Wed", my: "ဗုဒ္ဓဟူး" },
  { day: "Thu", my: "ကြာသပတေး" }, { day: "Fri", my: "သောကြာ" }, { day: "Sat", my: "စနေ" }, { day: "Sun", my: "တနင်္ဂနွေ" },
];

const MentorPreferences = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: mentorProfile } = useMentorProfile(user?.id);
  const queryClient = useQueryClient();

  const [hourlyRate, setHourlyRate] = useState("100");
  const [rateError, setRateError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("MMK");
  const [timezone, setTimezone] = useState("Asia/Yangon");
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  useEffect(() => {
    if (mentorProfile) {
      setHourlyRate(mentorProfile.hourly_rate?.toString() || "100");
      setCurrency(mentorProfile.currency || "MMK");
      setTimezone((mentorProfile as any).timezone || "Asia/Yangon");
      setIsAvailable(mentorProfile.is_available ?? true);
      setActiveDays(mentorProfile.available_days || []);
      setSpokenLanguages(mentorProfile.profile?.languages || []);
    }
  }, [mentorProfile]);

  const baseline = useMemo(() => ({
    hourlyRate: mentorProfile?.hourly_rate?.toString() || "100",
    currency: mentorProfile?.currency || "MMK",
    timezone: (mentorProfile as any)?.timezone || "Asia/Yangon",
    activeDays: [...(mentorProfile?.available_days || [])].sort().join("|"),
    languages: [...(mentorProfile?.profile?.languages || [])].sort().join("|"),
  }), [mentorProfile]);

  const isDirty =
    hourlyRate !== baseline.hourlyRate ||
    currency !== baseline.currency ||
    timezone !== baseline.timezone ||
    [...activeDays].sort().join("|") !== baseline.activeDays ||
    [...spokenLanguages].sort().join("|") !== baseline.languages;

  const toggleLanguage = (l: string) =>
    setSpokenLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  const toggleDay = (day: string) =>
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleAvailToggle = async (next: boolean) => {
    if (!user || togglingAvail) return;
    setTogglingAvail(true);
    const prev = isAvailable;
    setIsAvailable(next);
    const { error } = await supabase
      .from("mentor_profiles")
      .update({ is_available: next })
      .eq("id", user.id);
    if (error) {
      setIsAvailable(prev);
      toast.error(lang === "my" ? "ပြောင်း၍ မရပါ" : "Failed to update");
    } else {
      await queryClient.invalidateQueries({ queryKey: ["mentor-profile", user.id] });
    }
    setTogglingAvail(false);
  };

  const handleSave = async () => {
    if (!user || saving) return;
    const rate = Number(hourlyRate);
    if (!Number.isFinite(rate) || rate < 100 || rate > 50000) {
      setRateError(lang === "my" ? "နှုန်းထား 100 မှ 50,000 အတွင်း ဖြစ်ရပါမည်" : "Rate must be between 100 and 50,000");
      return;
    }
    setRateError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("mentor_profiles")
        .update({ hourly_rate: rate, currency, available_days: activeDays, timezone } as any)
        .eq("id", user.id);
      const { error: profileError } = await (supabase as any)
        .from("v_profiles").update({ languages: spokenLanguages }).eq("id", user.id);
      if (error || profileError) {
        toast.error(lang === "my" ? "သိမ်းဆည်း၍ မရပါ" : "Failed to save settings");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["mentor-profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <PageHeader
        title={lang === "my" ? "ရနိုင်သော အချိန်ဇယား" : "My Availability"}
        backPath="/dashboard"
      />
      <div className="mx-auto max-w-3xl px-5 md:px-8 md:pt-2">
        {/* Status banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border p-4 ${
            isAvailable
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-muted"
          }`}
        >
          <div className="flex items-start gap-3">
            {isAvailable ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
            ) : (
              <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            )}
            <div>
              <p className="text-sm font-bold text-foreground">
                {isAvailable
                  ? (lang === "my" ? "Booking လက်ခံနေသည်" : "You're accepting bookings")
                  : (lang === "my" ? "ခေါ်ဆိုမှု ခေတ္တရပ်ထားသည်" : "Bookings paused")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isAvailable
                  ? (lang === "my" ? "Mentee များ သင့်ကို မြင်ပြီး ဘွတ်ကင်လုပ်နိုင်ပါသည်" : "Mentees can find and book sessions with you")
                  : (lang === "my" ? "သင်၏ profile ကို mentee များ မမြင်နိုင်ပါ" : "Mentees can't see or book you right now")}
              </p>
            </div>
          </div>
          <Switch checked={isAvailable} onCheckedChange={handleAvailToggle} disabled={togglingAvail} />
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="slots" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="slots" className="rounded-lg text-xs font-semibold">
              <CalendarClock className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              {lang === "my" ? "အချိန်ဇယား" : "Time Slots"}
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-xs font-semibold">
              <Settings2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              {lang === "my" ? "နှုန်း & Profile" : "Rate & Profile"}
            </TabsTrigger>
          </TabsList>

          {/* Time Slots tab */}
          <TabsContent value="slots" className="mt-0 space-y-3">
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {lang === "my"
                  ? "၃ ဆင့်ဖြင့် အချိန်ဇယား ထည့်ပါ — (၁) ရက်များရွေး (၂) အချိန်များရွေး (၃) Slots ထည့်ပါ"
                  : "Add slots in 3 steps — (1) Pick dates (2) Pick times (3) Confirm. Mentees will only see times you add here."}
              </p>
            </div>
            <AvailabilityManager />
          </TabsContent>

          {/* Rate & Profile tab */}
          <TabsContent value="settings" className="mt-0 space-y-3">
            {/* Rate */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-1 text-sm font-bold text-foreground">{lang === "my" ? "နာရီစျေးနှုန်း" : "Hourly Rate"}</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {lang === "my" ? "တစ်နာရီစာ mentee များ ပေးရမည့်ပမာဏ" : "What mentees pay you per hour"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-10 items-center rounded-xl border border-border bg-muted px-3 text-xs font-medium text-foreground">Ks</span>
                <Input type="number" min={100} max={50000} step={100} value={hourlyRate} onChange={e => { setHourlyRate(e.target.value); setRateError(null); }} className={`h-10 w-32 rounded-xl text-center ${rateError ? "border-destructive" : ""}`} />
                <span className="text-xs text-muted-foreground">/ {lang === "my" ? "နာရီ" : "hr"}</span>
              </div>
              {rateError && <p className="mt-1 text-xs text-destructive">{rateError}</p>}
            </div>

            {/* Timezone */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-1 text-sm font-bold text-foreground">{lang === "my" ? "Timezone" : "Your Timezone"}</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {lang === "my" ? "သင်နေထိုင်ရာ အချိန်ဇုန် (Mentee များက သူတို့ဇုန် မြင်ရပါမည်)" : "Times are shown to mentees in their own timezone"}
              </p>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Active days (weekly hint) */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-1 text-sm font-bold text-foreground">{lang === "my" ? "ပုံမှန် ရနိုင်သော နေ့များ" : "Usual Available Days"}</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {lang === "my" ? "Profile တွင် ပြသမည့် ပုံမှန် နေ့များ (Slot ထည့်ခြင်းနဲ့ မဆိုင်ပါ)" : "Shown on your profile as a hint. Actual bookings only happen on slots you add."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => {
                  const active = activeDays.includes(d.day);
                  return (
                    <button key={d.day} type="button" onClick={() => toggleDay(d.day)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
                      {lang === "my" ? d.my : d.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Languages */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ပြောတတ်သော ဘာသာစကားများ" : "Spoken Languages"}</h3>
              <div className="flex flex-wrap gap-1.5">
                {SPOKEN_LANGUAGES.map(l => {
                  const active = spokenLanguages.includes(l);
                  return (
                    <button key={l} type="button" onClick={() => toggleLanguage(l)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {isDirty && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-20 z-10 pt-2 md:bottom-4">
                <Button variant="default" size="lg" className="w-full rounded-2xl shadow-navy" onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  {saving ? (lang === "my" ? "သိမ်းနေသည်..." : "Saving...") : (lang === "my" ? "ပြောင်းလဲမှုများ သိမ်းဆည်းရန်" : "Save Changes")}
                </Button>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MentorPreferences;
