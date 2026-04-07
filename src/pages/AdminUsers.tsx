import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Crown, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const roleColors: Record<string, string> = {
  jobseeker: "bg-muted text-muted-foreground",
  employer: "bg-primary/10 text-primary",
  mentor: "bg-emerald/10 text-emerald",
};

const AdminUsers = () => {
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name, avatar_url, headline, bio, location, primary_role, is_premium, email, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = users.filter((u: any) =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const selected = users.find((u: any) => u.id === selectedId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အသုံးပြုသူ စီမံခန့်ခွဲ" : "User Management"} />
      <div className="px-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အမည် သို့မဟုတ် အီးမေးလ်ဖြင့် ရှာ..." : "Search by name or email..."} className="h-10 rounded-xl pl-9" />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ဦး" : "users"}</p>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user: any, i: number) => (
              <motion.button key={user.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedId(user.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left active:bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{(user.display_name || "U").slice(0, 2).toUpperCase()}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{user.display_name || "User"}</h3>
                    {user.is_premium && <Crown className="h-3 w-3 text-primary" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{user.email} · {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[user.primary_role] || roleColors.jobseeker}`}>{user.primary_role}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{(selected.display_name || "U").slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.display_name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.email}</p>
                  <div className="mt-1 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[selected.primary_role] || roleColors.jobseeker}`}>{selected.primary_role}</span>
                    {selected.is_premium && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Premium</span>}
                  </div>
                </div>
              </div>

              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အချက်အလက်" : "Details"}</h3>
              <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                <p>{lang === "my" ? "တည်နေရာ" : "Location"}: {selected.location || "—"}</p>
                <p>{lang === "my" ? "ခေါင်းစဉ်" : "Headline"}: {selected.headline || "—"}</p>
                <p>{lang === "my" ? "စတင်ရက်" : "Joined"}: {new Date(selected.created_at).toLocaleDateString()}</p>
              </div>
              <Button variant="destructive" size="sm" className="w-full rounded-xl" onClick={() => { setSelectedId(null); setDeleteConfirmId(selected.id); }}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားရန်" : "Remove User"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setDeleteConfirmId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားမည်" : "Remove User"}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{lang === "my" ? "ဤအသုံးပြုသူကို ဖယ်ရှားမည်။ ဆက်လုပ်မည်လား?" : "This will remove the user's profile. Continue?"}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirmId(null)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={async () => {
                  const { error } = await supabase.from("profiles").delete().eq("id", deleteConfirmId);
                  if (error) { toast.error(lang === "my" ? "ဖယ်ရှား၍ မရပါ" : "Failed to remove user"); }
                  else { toast.success(lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားပြီး" : "User removed"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); }
                  setDeleteConfirmId(null);
                }}>{lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
