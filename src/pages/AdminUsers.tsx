import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Shield, Crown, ChevronRight, Ban, CheckCircle, Key, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const mockUsers = [
  { id: 1, name: "Maung Maung", nameMy: "မောင်မောင်", email: "maung@email.com", role: "member", premium: true, avatar: "MM", status: "active", joined: "Jan 2026" },
  { id: 2, name: "Khin Myat Noe", nameMy: "ခင်မြတ်နိုး", email: "khin@email.com", role: "member", premium: true, avatar: "KM", status: "active", joined: "Feb 2026", isMentor: true },
  { id: 3, name: "TechCorp Asia", nameMy: "TechCorp Asia", email: "hr@techcorp.com", role: "employer", premium: false, avatar: "TC", status: "active", joined: "Mar 2026" },
  { id: 4, name: "Suspicious User", nameMy: "သံသယရှိသူ", email: "sus@email.com", role: "member", premium: false, avatar: "SU", status: "suspended", joined: "Mar 2026" },
  { id: 5, name: "Min Htet", nameMy: "မင်းထက်", email: "min@email.com", role: "member", premium: false, avatar: "MH", status: "active", joined: "Dec 2025", isModerator: true },
];

const roleColors: Record<string, string> = {
  member: "bg-muted text-muted-foreground",
  employer: "bg-primary/10 text-primary",
  admin: "bg-destructive/10 text-destructive",
};

const AdminUsers = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [users, setUsers] = useState(mockUsers);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const selected = users.find(u => u.id === selectedId);

  const handleAction = (action: string) => {
    if (!selectedId) return;
    const labels: Record<string, { my: string; en: string }> = {
      suspend: { my: "ဆိုင်းငံ့ပြီးပါပြီ", en: "User suspended" },
      unsuspend: { my: "ပြန်ဖွင့်ပြီးပါပြီ", en: "User unsuspended" },
      promote_employer: { my: "အလုပ်ရှင်အဖြစ် ပြောင်းပြီးပါပြီ", en: "Upgraded to employer" },
      make_moderator: { my: "Moderator အဖြစ် ခန့်အပ်ပြီးပါပြီ", en: "Assigned as moderator" },
      delete: { my: "အကောင့် ဖျက်ပြီးပါပြီ", en: "Account deleted" },
    };
    toast({ title: lang === "my" ? labels[action]?.my : labels[action]?.en });
    if (action === "suspend") {
      setUsers(prev => prev.map(u => u.id === selectedId ? { ...u, status: "suspended" } : u));
    } else if (action === "unsuspend") {
      setUsers(prev => prev.map(u => u.id === selectedId ? { ...u, status: "active" } : u));
    } else if (action === "delete") {
      setUsers(prev => prev.filter(u => u.id !== selectedId));
    }
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "အသုံးပြုသူ စီမံခန့်ခွဲ" : "User Management"} />
      <div className="px-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အမည် သို့မဟုတ် အီးမေးလ်ဖြင့် ရှာ..." : "Search by name or email..."} className="h-10 rounded-xl pl-9" />
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ဦး" : "users"}</p>

        <div className="space-y-2">
          {filtered.map((user, i) => (
            <motion.button
              key={user.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedId(user.id)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left active:bg-muted/30 ${user.status === "suspended" ? "border-destructive/20 opacity-60" : "border-border"}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{user.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? user.nameMy : user.name}</h3>
                  {user.premium && <Crown className="h-3 w-3 text-primary" />}
                  {(user as any).isMentor && <Shield className="h-3 w-3 text-emerald" />}
                  {(user as any).isModerator && <Shield className="h-3 w-3 text-accent" />}
                </div>
                <p className="text-[10px] text-muted-foreground">{user.email} · {user.joined}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[user.role] || roleColors.member}`}>{user.role}</span>
              {user.status === "suspended" && <Ban className="h-4 w-4 text-destructive" />}
            </motion.button>
          ))}
        </div>
      </div>

      {/* User Detail */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{selected.avatar}</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{lang === "my" ? selected.nameMy : selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.email}</p>
                  <div className="mt-1 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[selected.role]}`}>{selected.role}</span>
                    {selected.premium && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Premium</span>}
                    {selected.status === "suspended" && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">{lang === "my" ? "ဆိုင်းငံ့" : "Suspended"}</span>}
                  </div>
                </div>
              </div>

              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "လုပ်ဆောင်ချက်များ" : "Actions"}</h3>
              <div className="space-y-2">
                {selected.status === "active" ? (
                  <Button variant="outline" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("suspend")}>
                    <Ban className="mr-2 h-4 w-4 text-destructive" /> {lang === "my" ? "ဆိုင်းငံ့ရန်" : "Suspend User"}
                  </Button>
                ) : (
                  <Button variant="outline" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("unsuspend")}>
                    <CheckCircle className="mr-2 h-4 w-4 text-emerald" /> {lang === "my" ? "ပြန်ဖွင့်ရန်" : "Unsuspend"}
                  </Button>
                )}
                {selected.role === "member" && (
                  <Button variant="outline" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("promote_employer")}>
                    <Users className="mr-2 h-4 w-4 text-primary" /> {lang === "my" ? "အလုပ်ရှင်အဖြစ် ပြောင်း" : "Upgrade to Employer"}
                  </Button>
                )}
                {selected.role === "member" && !(selected as any).isModerator && (
                  <Button variant="outline" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("make_moderator")}>
                    <Shield className="mr-2 h-4 w-4 text-accent" /> {lang === "my" ? "Moderator ခန့်အပ်" : "Assign Moderator"}
                  </Button>
                )}
                <Button variant="outline" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("view_tokens")}>
                  <Key className="mr-2 h-4 w-4" /> {lang === "my" ? "Delegate Token ကြည့်ရန်" : "View Delegate Tokens"}
                </Button>
                <Button variant="destructive" size="default" className="w-full justify-start rounded-xl" onClick={() => handleAction("delete")}>
                  <Trash2 className="mr-2 h-4 w-4" /> {lang === "my" ? "အကောင့် ဖျက်ရန်" : "Force Delete Account"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
