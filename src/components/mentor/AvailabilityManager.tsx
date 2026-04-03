import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, CalendarIcon, Globe } from "lucide-react";
import { format, addMonths, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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

  const defaultTz = mentorProfile?.timezone || guessTimezoneFromPhone(profile?.phone);
  const [timezone, setTimezone] = useState<string>(defaultTz);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Update timezone when mentor profile loads
  const [tzInitialized, setTzInitialized] = useState(false);
  if (mentorProfile?.timezone && !tzInitialized) {
    setTimezone(mentorProfile.timezone);
    setTzInitialized(true);
  }

  const today = startOfDay(new Date());
  const maxDate = addMonths(today, 6);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dateSlots = slots.filter(s => s.slot_date === selectedDateStr);

  // Group slots by date for the overview
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

  // Dates that have slots (for calendar highlighting)
  const datesWithSlots = useMemo(() => {
    return new Set(slots.filter(s => s.slot_date).map(s => s.slot_date!));
  }, [slots]);

  const handleAdd = () => {
    if (!selectedDate) {
      toast({ title: lang === "my" ? "ရက်ရွေးပါ" : "Select a date first", variant: "destructive" });
      return;
    }
    const endTime = addMinutes(selectedTime, 60);
    const exists = dateSlots.some(s => s.start_time === selectedTime);
    if (exists) {
      toast({ title: lang === "my" ? "ရှိပြီးသား" : "Slot already exists", variant: "destructive" });
      return;
    }
    const dayKey = DAY_KEY_MAP[selectedDate.getDay()];
    addSlot.mutate({
      slot_date: selectedDateStr,
      day_of_week: dayKey,
      start_time: selectedTime,
      end_time: endTime,
    });
  };

  const handleDelete = (id: string) => deleteSlot.mutate(id);

  const handleSaveTimezone = async () => {
    if (!user) return;
    await supabase.from("mentor_profiles").update({ timezone } as any).eq("id", user.id);
    toast({ title: lang === "my" ? "Timezone သိမ်းပြီး" : "Timezone saved" });
  };

  // Sorted upcoming dates with slots
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

      {/* Date picker */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          {lang === "my" ? "ရက် ရွေးချယ်ပါ (၆ လအထိ)" : "Pick a date (up to 6 months)"}
        </label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start rounded-xl text-left text-xs font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : (lang === "my" ? "ရက် ရွေးပါ" : "Select date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setCalendarOpen(false);
              }}
              disabled={(date) => isBefore(date, today) || date > maxDate}
              modifiers={{ hasSlots: (date) => datesWithSlots.has(format(date, "yyyy-MM-dd")) }}
              modifiersClassNames={{ hasSlots: "bg-primary/10 font-bold" }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Slots for selected date */}
      {selectedDate && (
        <>
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE, MMM d, yyyy")}
          </p>
          <div className="mb-3 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {dateSlots.map(slot => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-xs font-medium text-foreground">
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </span>
                  <div className="flex items-center gap-2">
                    {slot.is_booked && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                        {lang === "my" ? "ချိန်းထား" : "Booked"}
                      </span>
                    )}
                    <button onClick={() => handleDelete(slot.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {dateSlots.length === 0 && (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                {lang === "my" ? "ဤနေ့တွင် အချိန်ဇယား မရှိပါ" : "No slots for this date"}
              </p>
            )}
          </div>

          {/* Add new slot */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{formatTime(t)}</option>
              ))}
            </select>
            <Button
              variant="default"
              size="sm"
              className="rounded-lg text-xs"
              onClick={handleAdd}
              disabled={addSlot.isPending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {lang === "my" ? "ထည့်ရန်" : "Add"}
            </Button>
          </div>
        </>
      )}

      {/* Upcoming slots overview */}
      {upcomingDates.length > 0 && !selectedDate && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {lang === "my" ? "လာမည့် ရက်များ" : "Upcoming availability"}
          </p>
          {upcomingDates.slice(0, 5).map(dateStr => {
            const daySlots = slotsByDate.get(dateStr) || [];
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(new Date(dateStr + "T00:00:00"))}
                className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-left transition-colors active:bg-muted/70"
              >
                <span className="text-xs font-medium text-foreground">
                  {format(new Date(dateStr + "T00:00:00"), "EEE, MMM d")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {daySlots.length} {lang === "my" ? "ခု" : daySlots.length === 1 ? "slot" : "slots"}
                </span>
              </button>
            );
          })}
          {upcomingDates.length > 5 && (
            <p className="text-center text-[10px] text-muted-foreground">
              +{upcomingDates.length - 5} {lang === "my" ? "ရက်" : "more days"}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
