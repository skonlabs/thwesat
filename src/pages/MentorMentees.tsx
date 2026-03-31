import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageCircle, Calendar, Star, ChevronRight, Search,
  Clock, Briefcase, MapPin, BookOpen, TrendingUp, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";

const mockMentees = [
  {
    id: 1, avatar: "TW", name: "Thiri Win", nameMy: "သီရိဝင်း",
    role: "Frontend Developer", location: "Yangon",
    sessions: 6, lastSession: "Mar 28", nextSession: "Apr 5, 2:00 PM",
    rating: 4.8, status: "active" as const,
    goals: "Transition to senior role at a Singapore startup",
    goalsMy: "စင်ကာပူ startup တွင် senior role သို့ ပြောင်းရန်",
    topics: ["Career Coaching", "Interview Prep"],
    notes: "Strong React skills, needs system design practice",
    notesMy: "React ကျွမ်းကျင်, system design လေ့ကျင့်ရန်လို",
    messages: [
      { sender: "them" as const, text: "Thank you for the mock interview tips!", time: "Mar 28" },
      { sender: "me" as const, text: "You're doing great, keep practicing!", time: "Mar 28" },
      { sender: "them" as const, text: "Can we focus on system design next session?", time: "Mar 30" },
    ],
  },
  {
    id: 2, avatar: "AK", name: "Aung Kyaw", nameMy: "အောင်ကျော်",
    role: "Fresh Graduate", location: "Mandalay",
    sessions: 3, lastSession: "Mar 25", nextSession: "Apr 3, 10:00 AM",
    rating: 0, status: "active" as const,
    goals: "Get first developer job in Malaysia or Singapore",
    goalsMy: "မလေးရှား သို့မဟုတ် စင်ကာပူတွင် ပထမ developer အလုပ်ရရန်",
    topics: ["CV Review", "Career Coaching"],
    notes: "Needs CV restructuring, good Java foundation",
    notesMy: "CV ပြန်ပြင်ရန်လို, Java အခြေခံကောင်း",
    messages: [
      { sender: "them" as const, text: "I've updated my CV, can you review?", time: "Mar 25" },
      { sender: "me" as const, text: "Sure, send it over before our next session.", time: "Mar 25" },
    ],
  },
  {
    id: 3, avatar: "HS", name: "Hnin Si", nameMy: "နှင်းဆီ",
    role: "QA Engineer", location: "Yangon",
    sessions: 12, lastSession: "Mar 20", nextSession: null,
    rating: 5, status: "completed" as const,
    goals: "Switch from QA to full-stack development",
    goalsMy: "QA မှ full-stack development သို့ ပြောင်းရန်",
    topics: ["Technical Guidance", "Career Coaching"],
    notes: "Successfully transitioned — landed a dev role at Wave Money!",
    notesMy: "အောင်မြင်စွာ ပြောင်းနိုင်ခဲ့ — Wave Money တွင် dev role ရရှိ!",
    messages: [
      { sender: "them" as const, text: "I got the offer!! Thank you so much 🙏", time: "Mar 15" },
      { sender: "me" as const, text: "Congratulations! So proud of you! 🎉", time: "Mar 15" },
    ],
  },
  {
    id: 4, avatar: "ZM", name: "Zaw Min", nameMy: "ဇော်မင်း",
    role: "Data Analyst", location: "Bangkok",
    sessions: 1, lastSession: "Mar 22", nextSession: null,
    rating: 0, status: "new" as const,
    goals: "Learn Python for data science career",
    goalsMy: "Data science အတွက် Python သင်ယူရန်",
    topics: ["Technical Guidance"],
    notes: "Just started, assess skill level in next session",
    notesMy: "အစမှစတင်, နောက် session တွင် skill level အကဲဖြတ်ရန်",
    messages: [
      { sender: "them" as const, text: "Hi! I'm excited to start learning with you.", time: "Mar 22" },
    ],
  },
  {
    id: 5, avatar: "ML", name: "May Lwin", nameMy: "မေလွင်",
    role: "UI/UX Designer", location: "Yangon",
    sessions: 0, lastSession: null, nextSession: null,
    rating: 0, status: "pending" as const,
    goals: "Build portfolio for overseas job applications",
    goalsMy: "နိုင်ငံခြား အလုပ်လျှောက်ရန် portfolio တည်ဆောက်",
    topics: ["Career Coaching", "Resume Review"],
    notes: "",
    notesMy: "",
    messages: [
      { sender: "them" as const, text: "Hello, I'd love to get your guidance on building my portfolio.", time: "Mar 31" },
    ],
  },
];

const statusConfig = {
  active: { label: { my: "လက်ရှိ", en: "Active" }, color: "text-emerald bg-emerald/10" },
  completed: { label: { my: "ပြီးဆုံး", en: "Completed" }, color: "text-muted-foreground bg-muted" },
  new: { label: { my: "အသစ်", en: "New" }, color: "text-primary bg-primary/10" },
  pending: { label: { my: "စောင့်ဆိုင်း", en: "Pending" }, color: "text-accent bg-accent/10" },
};

type FilterType = "all" | "active" | "new" | "pending" | "completed";

const MentorMentees = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedMentee, setSelectedMentee] = useState<typeof mockMentees[0] | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "messages" | "notes">("overview");

  const filtered = mockMentees
    .filter(m => filter === "all" || m.status === filter)
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "Mentee များ" : "My Mentees"} />

      <div className="px-5">
        {/* Summary */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { value: mockMentees.filter(m => m.status === "active").length, label: lang === "my" ? "လက်ရှိ" : "Active", color: "text-emerald" },
            { value: mockMentees.filter(m => m.status === "new").length, label: lang === "my" ? "အသစ်" : "New", color: "text-primary" },
            { value: mockMentees.filter(m => m.status === "pending").length, label: lang === "my" ? "စောင့်" : "Pending", color: "text-accent" },
            { value: mockMentees.reduce((a, m) => a + m.sessions, 0), label: lang === "my" ? "Sessions" : "Sessions", color: "text-foreground" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "my" ? "Mentee ရှာရန်..." : "Search mentees..."}
            className="h-10 rounded-xl pl-9"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {(["all", "active", "new", "pending", "completed"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f].label.my : statusConfig[f].label.en)}
            </button>
          ))}
        </div>

        {/* Mentee List */}
        <div className="space-y-3">
          {filtered.map((mentee, i) => {
            const sc = statusConfig[mentee.status];
            return (
              <motion.button
                key={mentee.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { setSelectedMentee(mentee); setDetailTab("overview"); }}
                className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {mentee.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{lang === "my" ? mentee.nameMy : mentee.name}</h3>
                        <p className="truncate text-[11px] text-muted-foreground">{mentee.role}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                        {lang === "my" ? sc.label.my : sc.label.en}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {mentee.location}</span>
                      <span className="flex items-center gap-0.5"><BookOpen className="h-3 w-3" strokeWidth={1.5} /> {mentee.sessions} sessions</span>
                    </div>
                    {mentee.nextSession && (
                      <p className="mt-1 text-[10px] font-medium text-primary">
                        <Clock className="mr-0.5 inline h-3 w-3" strokeWidth={1.5} />
                        {lang === "my" ? "နောက် session: " : "Next: "}{mentee.nextSession}
                      </p>
                    )}
                    {mentee.status === "pending" && mentee.messages.length > 0 && (
                      <p className="mt-1 truncate text-[10px] italic text-muted-foreground">
                        "{mentee.messages[mentee.messages.length - 1].text}"
                      </p>
                    )}
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
      </div>

      {/* Mentee Detail Sheet */}
      <Sheet open={!!selectedMentee} onOpenChange={open => { if (!open) setSelectedMentee(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-24">
          {selectedMentee && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {selectedMentee.avatar}
                  </div>
                  <div>
                    <SheetTitle className="text-base">{lang === "my" ? selectedMentee.nameMy : selectedMentee.name}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {selectedMentee.role} · {selectedMentee.location}
                    </SheetDescription>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig[selectedMentee.status].color}`}>
                      {lang === "my" ? statusConfig[selectedMentee.status].label.my : statusConfig[selectedMentee.status].label.en}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              {/* Tabs */}
              <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
                {(["overview", "messages", "notes"] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                      detailTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}>
                    {tab === "overview" ? (lang === "my" ? "အကျဉ်းချုပ်" : "Overview")
                      : tab === "messages" ? (lang === "my" ? "မက်ဆေ့ချ်" : "Messages")
                      : (lang === "my" ? "မှတ်ချက်" : "Notes")}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{selectedMentee.sessions}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? "Sessions" : "Sessions"}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{selectedMentee.lastSession || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? "နောက်ဆုံး" : "Last"}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{selectedMentee.rating > 0 ? selectedMentee.rating : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အမှတ်" : "Rating"}</p>
                    </div>
                  </div>

                  {/* Goals */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "ပန်းတိုင်" : "Goals"}</p>
                    <p className="text-xs text-foreground">{lang === "my" ? selectedMentee.goalsMy : selectedMentee.goals}</p>
                  </div>

                  {/* Topics */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase">{lang === "my" ? "အကြောင်းအရာများ" : "Focus Areas"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMentee.topics.map(t => (
                        <span key={t} className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium text-foreground">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Next Session */}
                  {selectedMentee.nextSession && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-[10px] font-semibold text-primary">{lang === "my" ? "နောက် Session" : "Upcoming Session"}</p>
                      <p className="text-sm font-semibold text-foreground">{selectedMentee.nextSession}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="gold" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => navigate("/messages/chat")}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => navigate("/mentors/bookings?mentee=" + selectedMentee.id)}>
                      <Calendar className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "ချိန်းဆိုရန်" : "Book Session"}
                    </Button>
                  </div>

                  {selectedMentee.status === "pending" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs">
                        {lang === "my" ? "ငြင်းပယ်" : "Decline"}
                      </Button>
                      <Button variant="gold" size="sm" className="flex-1 rounded-lg text-xs">
                        {lang === "my" ? "လက်ခံရန်" : "Accept Mentee"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "messages" && (
                <div className="space-y-3">
                  {selectedMentee.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        msg.sender === "me"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      }`}>
                        <p className="text-xs">{msg.text}</p>
                        <p className={`mt-1 text-[9px] ${msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full rounded-lg text-xs" onClick={() => navigate("/messages/chat")}>
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "စကားပြောခန်းသို့ သွားရန်" : "Open Full Chat"}
                  </Button>
                </div>
              )}

              {detailTab === "notes" && (
                <div className="space-y-3">
                  {selectedMentee.notes ? (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs text-foreground">{lang === "my" ? selectedMentee.notesMy : selectedMentee.notes}</p>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {lang === "my" ? "မှတ်ချက် မရှိသေးပါ" : "No notes yet"}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MentorMentees;
