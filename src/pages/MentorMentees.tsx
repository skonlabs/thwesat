import { useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageCircle, Calendar, Search, MapPin, BookOpen, ChevronRight, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useMentorMentees } from "@/hooks/use-mentor-bookings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
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
  const { startConversation } = useStartConversation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Accept mentee: update mentor_mentees status to active
  const acceptMentee = useMutation({
    mutationFn: async (menteeId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Find the pending booking and confirm it
      const { data: pendingBooking } = await supabase
        .from("mentor_bookings")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("mentee_id", menteeId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (pendingBooking) {
        const { error } = await supabase
          .from("mentor_bookings")
          .update({ status: "confirmed" })
          .eq("id", pendingBooking.id);
        if (error) throw error;
      }

      // Upsert mentor_mentees to active
      const { data: existing } = await supabase
        .from("mentor_mentees")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("mentee_id", menteeId)
        .maybeSingle();

      if (existing) {
        await supabase.from("mentor_mentees").update({ status: "active" }).eq("id", existing.id);
      } else {
        await supabase.from("mentor_mentees").insert({
          mentor_id: user.id,
          mentee_id: menteeId,
          status: "active",
        });
      }
    },
    onSuccess: async (_: unknown, menteeId: string) => {
      // Notify mentee
      if (user) {
        const { data: mentorProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        const mentorName = mentorProfile?.display_name || "Your mentor";
        await supabase.from("notifications").insert({
          user_id: menteeId,
          notification_type: "mentor",
          title: `${mentorName} accepted you as a mentee!`,
          title_my: `${mentorName} သင့်ကို mentee အဖြစ် လက်ခံပြီ!`,
          description: "You can now schedule sessions and start learning.",
          description_my: "Session များ ချိန်းဆိုပြီး သင်ယူနိုင်ပါပြီ။",
          link_path: "/mentors/bookings",
        });
      }
      toast.success(lang === "my" ? "Mentee လက်ခံပြီး" : "Mentee accepted");
      queryClient.invalidateQueries({ queryKey: ["mentor-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
      setSelectedId(null);
    },
    onError: () => {
      toast.error(lang === "my" ? "လက်ခံ၍ မရပါ" : "Failed to accept mentee");
    },
  });

  // Decline mentee: cancel pending bookings
  const declineMentee = useMutation({
    mutationFn: async (menteeId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_bookings")
        .update({ status: "cancelled" })
        .eq("mentor_id", user.id)
        .eq("mentee_id", menteeId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: async (_: unknown, menteeId: string) => {
      // Notify mentee
      if (user) {
        const { data: mentorProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        const mentorName = mentorProfile?.display_name || "A mentor";
        await supabase.from("notifications").insert({
          user_id: menteeId,
          notification_type: "mentor",
          title: `${mentorName} declined your mentee request`,
          title_my: `${mentorName} သင့် mentee တောင်းဆိုမှုကို ငြင်းပယ်ပြီ`,
          description: "You can explore other mentors on the platform.",
          description_my: "အခြား mentor များကို ရှာဖွေနိုင်ပါသည်။",
          link_path: "/mentors",
        });
      }
      toast.success(lang === "my" ? "Mentee ငြင်းပယ်ပြီး" : "Mentee declined");
      queryClient.invalidateQueries({ queryKey: ["mentor-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
      setSelectedId(null);
    },
    onError: () => {
      toast.error(lang === "my" ? "ငြင်းပယ်၍ မရပါ" : "Failed to decline mentee");
    },
  });

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
      <PageHeader title={lang === "my" ? "Mentee များ" : "My Mentees"} backPath="/mentors/dashboard" />
      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { value: enriched.filter((m: any) => m.status === "active").length, label: lang === "my" ? "လက်ရှိ" : "Active", color: "text-emerald", action: () => setFilter("active") },
            { value: enriched.filter((m: any) => m.status === "pending").length, label: lang === "my" ? "စောင့်" : "Pending", color: "text-accent", action: () => setFilter("pending") },
            { value: enriched.reduce((a: number, m: any) => a + (m.sessions_completed || 0), 0), label: "Sessions", color: "text-foreground", action: () => navigate("/mentors/bookings") },
          ].map((s, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={s.action} className="rounded-xl border border-border bg-card p-3 text-center transition-colors active:bg-muted/30">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.button>
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
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mentee: any, i: number) => {
              const sc = statusConfig[mentee.status] || statusConfig.pending;
              return (
                <motion.button key={mentee.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedId(mentee.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
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

                {/* Inline edit for goals & notes */}
                {selectedMentee.status === "active" && (
                  <EditMenteeFields
                    menteeRelId={selectedMentee.id}
                    currentGoals={selectedMentee.goals || ""}
                    currentNotes={selectedMentee.notes || ""}
                    lang={lang}
                  />
                )}

                <div className="flex gap-2">
                  <Button variant="default" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => { setSelectedId(null); startConversation(selectedMentee.mentee_id); }}>
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => navigate("/mentors/bookings")}>
                    <Calendar className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"}
                  </Button>
                </div>
                {selectedMentee.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg text-xs border-destructive text-destructive"
                      disabled={declineMentee.isPending}
                      onClick={() => declineMentee.mutate(selectedMentee.mentee_id)}
                    >
                      {lang === "my" ? "ငြင်းပယ်" : "Decline"}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 rounded-lg text-xs"
                      disabled={acceptMentee.isPending}
                      onClick={() => acceptMentee.mutate(selectedMentee.mentee_id)}
                    >
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

/** Inline editor for mentee goals & notes */
function EditMenteeFields({ menteeRelId, currentGoals, currentNotes, lang }: { menteeRelId: string; currentGoals: string; currentNotes: string; lang: string }) {
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState(currentGoals);
  const [notes, setNotes] = useState(currentNotes);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mentor_mentees").update({ goals, notes }).eq("id", menteeRelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "my" ? "သိမ်းပြီး" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["mentor-mentees"] });
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs" onClick={() => setEditing(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "ပန်းတိုင်/မှတ်ချက် ပြင်ရန်" : "Edit Goals & Notes"}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "ပန်းတိုင်" : "Goals"}</label>
        <Textarea value={goals} onChange={e => setGoals(e.target.value)} className="rounded-lg text-xs" rows={2} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "မှတ်ချက်" : "Notes"}</label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-lg text-xs" rows={2} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => setEditing(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
        <Button variant="default" size="sm" className="flex-1 rounded-lg text-xs" disabled={save.isPending} onClick={() => save.mutate()}>{lang === "my" ? "သိမ်းရန်" : "Save"}</Button>
      </div>
    </div>
  );
}

export default MentorMentees;