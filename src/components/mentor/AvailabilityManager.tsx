import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, CalendarIcon, Globe, Copy, Zap, Check, X } from "lucide-react";
import { format, addMonths, addDays, isBefore, startOfDay, eachDayOfInterval, isWeekend, getDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useMentorAllAvailability, useAddAvailabilitySlot, useDeleteAvailabilitySlot } from "@/hooks/use-mentor-availability";
import { useMentorProfile } from "@/hooks/use-mentor-data";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
];

const DAY_KEY_MAP: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

const TIMEZONES = [
  { value: "Asia/Yangon", label: "Myanmar (GMT+6:30)" },
  { value: "Asia/Bangkok", label: "Thailand (GMT+7)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia (GMT+8)" },
  { value: "Asia/Tokyo", label: "Japan (GMT+9)" },
  { value: "Asia/Seoul", label: "Korea (GMT+9)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kolkata", label: "India (GMT+5:30)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+11)" },
];

interface QuickTemplate {
  label: string;
  labelMy: string;
  times: string[];
  icon: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { label: "Morning (8–12)", labelMy: "မနက်ပိုင်း (၈–၁၂)", times: ["08:00", "09:00", "10:00", "11:00"], icon: "🌅" },
  { label: "Afternoon (1–5)", labelMy: "နေ့လည်ပိုင်း (၁–၅)", times: ["13:00", "14:00", "15:00", "16:00"], icon: "☀️" },
  { label: "Evening (6–9)", labelMy: "ညနေပိုင်း (၆–၉)", times: ["18:00", "19:00", "20:00"], icon: "🌙" },
  { label: "Full Day (9–5)", labelMy: "တစ်နေ့လုံး (၉–၅)", times: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"], icon: "📅" },
];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  const suffix = hr >= 12 ? "PM" : "AM";
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${hr12}:${m} ${suffix}`;
}

function addMinutes(t: string, mins: number) {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function guessTimezoneFromPhone(phone?: string | null): string {
  if (!phone) return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Yangon";
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.startsWith("+95") || cleaned.startsWith("09")) return "Asia/Yangon";
  if (cleaned.startsWith("+66")) return "Asia/Bangkok";
  if (cleaned.startsWith("+65")) return "Asia/Singapore";
  if (cleaned.startsWith("+60")) return "Asia/Kuala_Lumpur";
  if (cleaned.startsWith("+81")) return "Asia/Tokyo";
  if (cleaned.startsWith("+82")) return "Asia/Seoul";
  if (cleaned.startsWith("+971")) return "Asia/Dubai";
  if (cleaned.startsWith("+91")) return "Asia/Kolkata";
  if (cleaned.startsWith("+44")) return "Europe/London";
  if (cleaned.startsWith("+1")) return "America/New_York";
  if (cleaned.startsWith("+61")) return "Australia/Sydney";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Yangon";
}

export default function AvailabilityManager() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data: mentorProfile } = useMentorProfile(user?.id);
  const { data: slots = [] } = useMentorAllAvailability(user?.id);
  const addSlot = useAddAvailabilitySlot();
  const deleteSlot = useDeleteAvailabilitySlot();
  const queryClient = useQueryClient();

  const defaultTz = mentorProfile?.timezone || guessTimezoneFromPhone(profile?.phone);
  const [timezone, setTimezone] = useState<string>(defaultTz);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [viewDate, setViewDate] = useState<Date | undefined>(undefined);

  const [tzInitialized, setTzInitialized] = useState(false);
  if (mentorProfile?.timezone && !tzInitialized) {
    setTimezone(mentorProfile.timezone);
    setTzInitialized(true);
  }

  const today = startOfDay(new Date());
  const maxDate = addMonths(today, 6);

  // Dates that have slots
  const datesWithSlots = useMemo(() => {
    return new Set(slots.filter(s => s.slot_date).map(s => s.slot_date!));
  }, [slots]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, typeof slots>();
    slots.forEach(s => {
      if (!s.slot_date) return;
      const arr = map.get(s.slot_date) || [];
      arr.push(s);
      map.set(s.slot_date, arr);
    });
    return map;
  }, [slots]);

  const toggleDate = useCallback((date: Date) => {
    setSelectedDates(prev => {
      const dateStr = format(date, "yyyy-MM-dd");
      const exists = prev.some(d => format(d, "yyyy-MM-dd") === dateStr);
      if (exists) return prev.filter(d => format(d, "yyyy-MM-dd") !== dateStr);
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  }, []);

  const toggleTime = useCallback((time: string) => {
    setSelectedTimes(prev => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });
  }, []);

  const applyTemplate = useCallback((template: QuickTemplate) => {
    setSelectedTimes(new Set(template.times));
  }, []);

  // Quick date selection helpers
  const selectWeekdays = useCallback((weeks: number) => {
    const end = addDays(today, weeks * 7);
    const days = eachDayOfInterval({ start: today, end: end > maxDate ? maxDate : end });
    setSelectedDates(days.filter(d => !isWeekend(d)));
  }, [today, maxDate]);

  const selectSpecificDays = useCallback((dayNumbers: number[], weeks: number) => {
    const end = addDays(today, weeks * 7);
    const days = eachDayOfInterval({ start: today, end: end > maxDate ? maxDate : end });
    setSelectedDates(days.filter(d => dayNumbers.includes(getDay(d))));
  }, [today, maxDate]);

  const handleBulkAdd = async () => {
    if (selectedDates.length === 0) {
      toast({ title: lang === "my" ? "ရက်ရွေးပါ" : "Select dates first", variant: "destructive" });
      return;
    }
    if (selectedTimes.size === 0) {
      toast({ title: lang === "my" ? "အချိန်ရွေးပါ" : "Select time slots first", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    const timesArr = Array.from(selectedTimes).sort();
    let added = 0;
    let skipped = 0;

    for (const date of selectedDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      const existingSlots = slotsByDate.get(dateStr) || [];
      const existingTimes = new Set(existingSlots.map(s => s.start_time));
      const dayKey = DAY_KEY_MAP[date.getDay()];

      for (const time of timesArr) {
        if (existingTimes.has(time)) {
          skipped++;
          continue;
        }
        const endTime = addMinutes(time, 60);
        const { error } = await supabase
          .from("mentor_availability_slots")
          .insert({ mentor_id: user!.id, slot_date: dateStr, day_of_week: dayKey, start_time: time, end_time: endTime } as any);
        if (!error) added++;
      }
    }

    setIsAdding(false);
    setSelectedDates([]);
    setSelectedTimes(new Set());

    // Invalidate queries
    toast({
      title: lang === "my"
        ? `${added} ခု ထည့်ပြီး${skipped > 0 ? ` (${skipped} ခု ရှိပြီးသား)` : ""}`
        : `Added ${added} slot${added !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} already existed)` : ""}`,
    });

    queryClient.invalidateQueries({ queryKey: ["mentor-availability"] });
    queryClient.invalidateQueries({ queryKey: ["mentor-all-availability"] });
  };

  const handleDelete = (id: string) => deleteSlot.mutate(id);

  const handleSaveTimezone = async () => {
    if (!user) return;
    await supabase.from("mentor_profiles").update({ timezone } as any).eq("id", user.id);
    toast({ title: lang === "my" ? "Timezone သိမ်းပြီး" : "Timezone saved" });
  };

  const upcomingDates = Array.from(slotsByDate.keys()).sort();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-foreground">
        <Clock className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
        {lang === "my" ? "အချိန်ဇယား စီမံရန်" : "Manage Availability"}
      </h3>

      {/* Timezone selector */}
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] px-2" onClick={handleSaveTimezone}>
          {lang === "my" ? "သိမ်း" : "Save"}
        </Button>
      </div>

      {/* Quick date selection */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          {lang === "my" ? "ရက် အမြန်ရွေးရန်" : "Quick date selection"}
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => selectWeekdays(1)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent">
            {lang === "my" ? "ဤအပတ် (တနလာ–သောကြာ)" : "This week (Mon–Fri)"}
          </button>
          <button onClick={() => selectWeekdays(2)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent">
            {lang === "my" ? "၂ ပတ်" : "Next 2 weeks"}
          </button>
          <button onClick={() => selectWeekdays(4)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent">
            {lang === "my" ? "၁ လ" : "Next month"}
          </button>
          <button onClick={() => selectSpecificDays([6, 0], 4)} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent">
            {lang === "my" ? "စနေ/တနင်္ဂနွေ (၄ ပတ်)" : "Weekends (4 wks)"}
          </button>
          {selectedDates.length > 0 && (
            <button onClick={() => setSelectedDates([])} className="rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10">
              <X className="mr-0.5 inline h-3 w-3" />
              {lang === "my" ? "ရှင်းရန်" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Calendar for manual date picking (multi-select) */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          {lang === "my" ? "ရက်များ ရွေးပါ (တစ်ခုထက်ပိုရွေးနိုင်)" : "Pick dates (tap to toggle, multi-select)"}
        </label>
        <div className="rounded-xl border border-border bg-background p-1">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => setSelectedDates(dates || [])}
            disabled={(date) => isBefore(date, today) || date > maxDate}
            modifiers={{ hasSlots: (date) => datesWithSlots.has(format(date, "yyyy-MM-dd")) }}
            modifiersClassNames={{ hasSlots: "ring-1 ring-primary/40 ring-inset" }}
            className={cn("p-2 pointer-events-auto")}
            month={viewDate}
            onMonthChange={setViewDate}
          />
        </div>
        {selectedDates.length > 0 && (
          <p className="mt-1.5 text-[10px] text-primary font-medium">
            {lang === "my"
              ? `${selectedDates.length} ရက် ရွေးထားသည်`
              : `${selectedDates.length} date${selectedDates.length !== 1 ? "s" : ""} selected`}
          </p>
        )}
      </div>

      {/* Time slot selection */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          {lang === "my" ? "အချိန် ရွေးပါ (တစ်ခုထက်ပို)" : "Select time slots (multi-select)"}
        </label>

        {/* Quick templates */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.label}
              onClick={() => applyTemplate(tmpl)}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Zap className="h-3 w-3 text-primary" strokeWidth={1.5} />
              <span>{tmpl.icon}</span>
              <span>{lang === "my" ? tmpl.labelMy : tmpl.label}</span>
            </button>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-4 gap-1">
          {TIME_OPTIONS.map(t => {
            const isSelected = selectedTimes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTime(t)}
                className={cn(
                  "rounded-md py-1.5 text-[10px] font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-background text-foreground hover:bg-accent"
                )}
              >
                {formatTime(t)}
              </button>
            );
          })}
        </div>
        {selectedTimes.size > 0 && (
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] text-primary font-medium">
              {lang === "my"
                ? `${selectedTimes.size} အချိန် ရွေးထားသည်`
                : `${selectedTimes.size} time slot${selectedTimes.size !== 1 ? "s" : ""} selected`}
            </p>
            <button onClick={() => setSelectedTimes(new Set())} className="text-[10px] text-destructive hover:underline">
              {lang === "my" ? "ရှင်းရန်" : "Clear"}
            </button>
          </div>
        )}
      </div>

      {/* Bulk add button */}
      {(selectedDates.length > 0 || selectedTimes.size > 0) && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            onClick={handleBulkAdd}
            disabled={isAdding || selectedDates.length === 0 || selectedTimes.size === 0}
            className="w-full rounded-xl text-xs font-semibold"
            size="sm"
          >
            {isAdding ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {lang === "my" ? "ထည့်နေသည်..." : "Adding..."}
              </span>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {lang === "my"
                  ? `${selectedDates.length} ရက် × ${selectedTimes.size} အချိန် = ${selectedDates.length * selectedTimes.size} Slot ထည့်ရန်`
                  : `Add ${selectedDates.length * selectedTimes.size} slots (${selectedDates.length} days × ${selectedTimes.size} times)`}
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Existing slots overview */}
      {upcomingDates.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {lang === "my" ? "ရှိပြီးသား အချိန်ဇယား" : "Existing availability"}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {slots.length} {lang === "my" ? "ခု" : "total slots"}
            </span>
          </div>
          {upcomingDates.slice(0, 7).map(dateStr => {
            const daySlots = (slotsByDate.get(dateStr) || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const bookedCount = daySlots.filter(s => s.is_booked).length;
            return (
              <div key={dateStr} className="rounded-lg border border-border bg-background p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">
                    {format(new Date(dateStr + "T00:00:00"), "EEE, MMM d")}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {daySlots.length} {lang === "my" ? "ခု" : "slots"}
                    {bookedCount > 0 && ` · ${bookedCount} ${lang === "my" ? "ချိန်းထား" : "booked"}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {daySlots.map(slot => (
                    <span
                      key={slot.id}
                      className={cn(
                        "group relative inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                        slot.is_booked
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {formatTime(slot.start_time)}
                      {!slot.is_booked && (
                        <button
                          onClick={() => handleDelete(slot.id)}
                          className="ml-0.5 hidden text-destructive group-hover:inline-flex sm:inline-flex"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {upcomingDates.length > 7 && (
            <p className="text-center text-[10px] text-muted-foreground">
              +{upcomingDates.length - 7} {lang === "my" ? "ရက်" : "more days"}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
