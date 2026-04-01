import { useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageCircle, Calendar, Search, Clock, MapPin, BookOpen, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useMentorMentees } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string }> = {
  active: { label: { my: "လက်ရှိ", en: "Active" }, color: "text-emerald bg-emerald/10" },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted" },
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-accent bg-accent/10" },
};

type FilterType = "all" | "active" | "pending" | "completed";

const MentorMentees = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: mentees = [], isLoading } = useMentorMentees();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "notes">("overview");

  // Fetch mentee profiles
  const menteeIds = [...new Set(mentees.map((m: any) => m.mentee_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["mentee-list-profiles", menteeIds],
    queryFn: async () => {
      if (!menteeIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, display_name, headline, avatar_url, location").in("id", menteeIds);
      return data || [];
    },
    enabled: menteeIds.length > 0,
  });
  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  const enriched = mentees.map((m: any) => ({ ...m, profile: profileMap.get(m.mentee_id) }));
  const filtered = enriched
    .filter((m: any) => filter === "all" || m.status === filter)
    .filter((m: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (m.profile?.display_name || "").toLowerCase().includes(q) || (m.profile?.headline || "").toLowerCase().includes(q);
    });

  const selectedMentee = enriched.find((m: any) => m.id === selectedId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Mentee များ" : "My Mentees"} />
      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { value: enriched.filter((m: any) => m.status === "active").length, label: lang === "my" ? "လက်ရှိ" : "Active", color: "text-emerald" },
            { value: enriched.filter((m: any) => m.status === "pending").length, label: lang === "my" ? "စောင့်" : "Pending", color: "text-accent" },
            { value: enriched.reduce((a: number, m: any) => a + (m.sessions_completed || 0), 0), label: "Sessions", color: "text-foreground" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "Mentee ရှာရန်..." : "Search mentees..."} className="h-10 rounded-xl pl-9" />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {(["all", "active", "pending", "completed"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mentee: any, i: number) => {
              const sc = statusConfig[mentee.status] || statusConfig.pending;
              return (
                <motion.button key={mentee.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => { setSelectedId(mentee.id); setDetailTab("overview"); }} className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{mentee.profile?.display_name?.slice(0, 2).toUpperCase() || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{mentee.profile?.display_name || "Mentee"}</h3>
                          <p className="truncate text-[11px] text-muted-foreground">{mentee.profile?.headline || ""}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>{lang === "my" ? sc.label.my : sc.label.en}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                        {mentee.profile?.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {mentee.profile.location}</span>}
                        <span className="flex items-center gap-0.5"><BookOpen className="h-3 w-3" strokeWidth={1.5} /> {mentee.sessions_completed || 0} sessions</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                </motion.button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm font-medium text-foreground">{lang === "my" ? "Mentee မရှိပါ" : "No mentees found"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedMentee} onOpenChange={open => { if (!open) setSelectedId(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-24">
          {selectedMentee && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">{selectedMentee.profile?.display_name?.slice(0, 2).toUpperCase() || "?"}</div>
                  <div>
                    <SheetTitle className="text-base">{selectedMentee.profile?.display_name || "Mentee"}</SheetTitle>
                    <SheetDescription className="text-xs">{selectedMentee.profile?.headline || ""} · {selectedMentee.profile?.location || ""}</SheetDescription>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${(statusConfig[selectedMentee.status] || statusConfig.pending).color}`}>
                      {lang === "my" ? (statusConfig[selectedMentee.status] || statusConfig.pending).label.my : (statusConfig[selectedMentee.status] || statusConfig.pending).label.en}
                    </span>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{selectedMentee.sessions_completed || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{selectedMentee.started_at ? new Date(selectedMentee.started_at).toLocaleDateString() : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စတင်" : "Started"}</p>
                  </div>
                </div>
                {selectedMentee.goals && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "ပန်းတိုင်" : "Goals"}</p>
                    <p className="text-xs text-foreground">{selectedMentee.goals}</p>
                  </div>
                )}
                {selectedMentee.notes && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "မှတ်ချက်" : "Notes"}</p>
                    <p className="text-xs text-foreground">{selectedMentee.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="default" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => navigate("/messages")}>
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => navigate("/mentors/bookings")}>
                    <Calendar className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"}
                  </Button>
                </div>
                {selectedMentee.status === "pending" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => setSelectedId(null)}>
                      {lang === "my" ? "ငြင်းပယ်" : "Decline"}
                    </Button>
                    <Button variant="default" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => setSelectedId(null)}>
                      {lang === "my" ? "လက်ခံရန်" : "Accept Mentee"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MentorMentees;
