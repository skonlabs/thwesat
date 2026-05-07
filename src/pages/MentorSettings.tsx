import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import useDirtyState from "@/hooks/use-dirty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
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

const MentorSettings = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: mentorProfile } = useMentorProfile(user?.id);

  const [hourlyRate, setHourlyRate] = useState("100");
  const [rateError, setRateError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("MMK");
  const [timezone, setTimezone] = useState("Asia/Yangon");
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);

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
    isAvailable: mentorProfile?.is_available ?? true,
    activeDays: [...(mentorProfile?.available_days || [])].sort().join("|"),
    languages: [...(mentorProfile?.profile?.languages || [])].sort().join("|"),
  }), [mentorProfile]);

  const isDirty =
    hourlyRate !== baseline.hourlyRate ||
    currency !== baseline.currency ||
    timezone !== baseline.timezone ||
    isAvailable !== baseline.isAvailable ||
    [...activeDays].sort().join("|") !== baseline.activeDays ||
    [...spokenLanguages].sort().join("|") !== baseline.languages;

  const { setDirty, markClean } = useDirtyState(false);
  useEffect(() => { setDirty(isDirty); }, [isDirty, setDirty]);

  const toggleLanguage = (l: string) =>
    setSpokenLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  const toggleDay = (day: string) =>
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleSave = async () => {
    if (!user) return;
    const rate = Number(hourlyRate);
    if (!Number.isFinite(rate) || rate < 100 || rate > 50000) {
      setRateError(lang === "my" ? "နှုန်းထား 100 မှ 50,000 အတွင်း ဖြစ်ရပါမည်" : "Rate must be between 100 and 50,000");
      return;
    }
    setRateError(null);
    const { error } = await supabase
      .from("mentor_profiles")
      .update({ hourly_rate: rate, currency, is_available: isAvailable, available_days: activeDays, timezone })
      .eq("id", user.id);
    const { error: profileError } = await supabase
      .from("profiles").update({ languages: spokenLanguages }).eq("id", user.id);
    if (error || profileError) {
      toast.error(lang === "my" ? "သိမ်းဆည်း၍ မရပါ" : "Failed to save settings");
    } else {
      markClean();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader title={lang === "my" ? "Mentor ဆက်တင်" : "Mentor Settings"} showBack />
      <div className="space-y-4 px-5">
        {/* Availability toggle */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-bold text-foreground">{lang === "my" ? "Booking လက်ခံမှု" : "Accepting bookings"}</p>
            <p className="text-[11px] text-muted-foreground">
              {isAvailable ? (lang === "my" ? "Mentee များက သင့်ကို ဘွတ်ကင်လုပ်နိုင်ပါသည်" : "Mentees can book sessions with you") : (lang === "my" ? "လောလောဆယ် ခေါ်ဆိုမှု မလက်ခံပါ" : "You're paused — no new bookings")}
            </p>
          </div>
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </motion.div>

        {/* Rate */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "နာရီစျေးနှုန်း" : "Hourly Rate"}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center rounded-xl border border-border bg-muted px-3 text-xs font-medium text-foreground">{lang === "my" ? "ကျပ်" : "MMK"}</span>
            <Input type="number" min={100} max={50000} step={100} value={hourlyRate} onChange={e => { setHourlyRate(e.target.value); setRateError(null); }} className={`h-10 w-28 rounded-xl text-center ${rateError ? "border-destructive" : ""}`} />
            <span className="text-xs text-muted-foreground">/ {lang === "my" ? "နာရီ" : "hr"}</span>
          </div>
          {rateError && <p className="mt-1 text-xs text-destructive">{rateError}</p>}
        </motion.div>

        {/* Timezone */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">{lang === "my" ? "Timezone" : "Timezone"}</h3>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>)}</SelectContent>
          </Select>
        </motion.div>

        {/* Active days */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ရနိုင်သော နေ့များ" : "Active Days"}</h3>
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
        </motion.div>

        {/* Languages */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-4">
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
        </motion.div>

        {/* Calendar */}
        <AvailabilityManager />
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <Button variant={isDirty ? "gold" : "default"} disabled={!isDirty} onClick={handleSave} className="h-11 w-full rounded-xl text-sm font-semibold">
          {isDirty ? (lang === "my" ? "ပြောင်းလဲမှုများ သိမ်းရန်" : "Save Changes") : (lang === "my" ? "သိမ်းပြီး" : "All changes saved")}
        </Button>
      </div>
    </div>
  );
};

export default MentorSettings;
