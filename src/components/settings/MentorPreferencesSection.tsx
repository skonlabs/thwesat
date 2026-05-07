import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const MentorPreferencesSection = () => {
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

  const toggleLanguage = (l: string) =>
    setSpokenLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  const toggleDay = (day: string) =>
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

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
        .update({ hourly_rate: rate, currency, is_available: isAvailable, available_days: activeDays, timezone })
        .eq("id", user.id);
      const { error: profileError } = await supabase
        .from("profiles").update({ languages: spokenLanguages }).eq("id", user.id);
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
    <div className="mb-4">
      <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
        {lang === "my" ? "Mentor အခြေအနေ" : "Mentor Preferences"}
      </h2>
      <div className="space-y-3">
        {/* Availability */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="pr-3">
            <p className="text-sm font-bold text-foreground">{lang === "my" ? "Booking လက်ခံမှု" : "Accepting bookings"}</p>
            <p className="text-[11px] text-muted-foreground">
              {isAvailable ? (lang === "my" ? "Mentee များက သင့်ကို ဘွတ်ကင်လုပ်နိုင်ပါသည်" : "Mentees can book sessions with you") : (lang === "my" ? "လောလောဆယ် ခေါ်ဆိုမှု မလက်ခံပါ" : "You're paused — no new bookings")}
            </p>
          </div>
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </div>

        {/* Rate */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "နာရီစျေးနှုန်း" : "Hourly Rate"}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center rounded-xl border border-border bg-muted px-3 text-xs font-medium text-foreground">{lang === "my" ? "ကျပ်" : "MMK"}</span>
            <Input type="number" min={100} max={50000} step={100} value={hourlyRate} onChange={e => { setHourlyRate(e.target.value); setRateError(null); }} className={`h-10 w-28 rounded-xl text-center ${rateError ? "border-destructive" : ""}`} />
            <span className="text-xs text-muted-foreground">/ {lang === "my" ? "နာရီ" : "hr"}</span>
          </div>
          {rateError && <p className="mt-1 text-xs text-destructive">{rateError}</p>}
        </div>

        {/* Timezone */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">{lang === "my" ? "Timezone" : "Timezone"}</h3>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Active days */}
        <div className="rounded-xl border border-border bg-card p-4">
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

        {/* Calendar */}
        <AvailabilityManager />

        {/* Save button — inline, only when dirty */}
        {isDirty && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="gold" onClick={handleSave} className="h-11 w-full rounded-xl text-sm font-semibold">
              {lang === "my" ? "Mentor အပြောင်းအလဲများ သိမ်းရန်" : "Save Mentor Changes"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MentorPreferencesSection;
