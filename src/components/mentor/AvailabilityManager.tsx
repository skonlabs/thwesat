import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMentorAllAvailability, useAddAvailabilitySlot, useDeleteAvailabilitySlot } from "@/hooks/use-mentor-availability";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  { key: "Mon", en: "Monday", my: "တနင်္လာ" },
  { key: "Tue", en: "Tuesday", my: "အင်္ဂါ" },
  { key: "Wed", en: "Wednesday", my: "ဗုဒ္ဓဟူး" },
  { key: "Thu", en: "Thursday", my: "ကြာသပတေး" },
  { key: "Fri", en: "Friday", my: "သောကြာ" },
  { key: "Sat", en: "Saturday", my: "စနေ" },
  { key: "Sun", en: "Sunday", my: "တနင်္ဂနွေ" },
];

const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
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

export default function AvailabilityManager() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { data: slots = [] } = useMentorAllAvailability(user?.id);
  const addSlot = useAddAvailabilitySlot();
  const deleteSlot = useDeleteAvailabilitySlot();
  const [selectedDay, setSelectedDay] = useState<string>("Mon");
  const [selectedTime, setSelectedTime] = useState<string>("09:00");

  const daySlots = slots.filter(s => s.day_of_week === selectedDay);

  const handleAdd = () => {
    const endTime = addMinutes(selectedTime, 60);
    const exists = daySlots.some(s => s.start_time === selectedTime);
    if (exists) {
      toast({ title: lang === "my" ? "ရှိပြီးသား" : "Already exists", variant: "destructive" });
      return;
    }
    addSlot.mutate({ day_of_week: selectedDay, start_time: selectedTime, end_time: endTime });
  };

  const handleDelete = (id: string) => {
    deleteSlot.mutate(id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-foreground">
        <Clock className="mr-1.5 inline h-4 w-4 text-primary" strokeWidth={1.5} />
        {lang === "my" ? "အချိန်ဇယား စီမံရန်" : "Manage Availability"}
      </h3>

      {/* Day tabs */}
      <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-none">
        {DAYS.map(d => (
          <button
            key={d.key}
            onClick={() => setSelectedDay(d.key)}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
              selectedDay === d.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {lang === "my" ? d.my.slice(0, 3) : d.key}
          </button>
        ))}
      </div>

      {/* Existing slots for selected day */}
      <div className="mb-3 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {daySlots.map(slot => (
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
        {daySlots.length === 0 && (
          <p className="py-3 text-center text-[11px] text-muted-foreground">
            {lang === "my" ? "ဤနေ့တွင် အချိန်ဇယား မရှိပါ" : "No slots for this day"}
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
    </motion.div>
  );
}
