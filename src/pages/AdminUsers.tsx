import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Crown, Trash2, Shield, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface PendingRoleChange {
  userId: string;
  userName: string;
  role: "admin" | "moderator";
  action: "add" | "remove";
}

const PAGE_SIZE = 100;

const AdminUsers = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, headline, bio, location, primary_role, is_premium, email, created_at, skills, languages, phone")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch system roles for all users
  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data || [];
    },
  });

  const roleMap = new Map<string, string[]>();
  allRoles.forEach((r: any) => {
    const existing = roleMap.get(r.user_id) || [];
    existing.push(r.role);
    roleMap.set(r.user_id, existing);
  });

  const filtered = users.filter((u: any) => {
    const matchesSearch =
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      u.primary_role === roleFilter ||
      (roleFilter === "premium" && u.is_premium);
    return matchesSearch && matchesRole;
  });

  const selected = users.find((u: any) => u.id === selectedId);
  const selectedSystemRoles = selected ? roleMap.get(selected.id) || [] : [];

  const premiumCount = users.filter((u: any) => u.is_premium).length;
  const employerCount = users.filter((u: any) => u.primary_role === "employer").length;
  const mentorCount = users.filter((u: any) => u.primary_role === "mentor").length;

  const handleTogglePremium = async (userId: string, currentPremium: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: !currentPremium })
      .eq("id", userId);
    if (error) {
      toast.error(lang === "my" ? "ပရီမီယံ ပြောင်း၍ မရပါ" : "Failed to toggle premium");
    } else {
      toast.success(
        !currentPremium
          ? (lang === "my" ? "ပရီမီယံ ဖွင့်ပြီး" : "Premium activated")
          : (lang === "my" ? "ပရီမီယံ ပိတ်ပြီး" : "Premium deactivated")
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
    }
  };

  /** Called when the admin clicks a role Switch — shows a confirmation dialog instead of acting immediately */
  const requestRoleChange = (
    userId: string,
    userName: string,
    role: "admin" | "moderator",
    checked: boolean
  ) => {
    setPendingRoleChange({ userId, userName, role, action: checked ? "add" : "remove" });
  };

  /** Executes the role change after confirmation */
  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { userId, role, action } = pendingRoleChange;

    if (action === "add") {
      const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
      if (error) {
        toast.error(lang === "my" ? "Role သတ်မှတ်၍ မရပါ" : `Failed to set ${role} role`);
      } else {
        toast.success(lang === "my" ? `${role} Role သတ်မှတ်ပြီး` : `${role} role assigned`);
        queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) {
        toast.error(lang === "my" ? "Role ဖယ်ရှား၍ မရပါ" : `Failed to remove ${role} role`);
      } else {
        toast.success(lang === "my" ? `${role} Role ဖယ်ရှားပြီး` : `${role} role removed`);
        queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      }
    }
    setPendingRoleChange(null);
  };

  // User to delete (for display name in delete dialog)
  const userToDelete = deleteConfirmId ? users.find((u: any) => u.id === deleteConfirmId) : null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={lang === "my" ? "အသုံးပြုသူ စီမံခန့်ခွဲ" : "User Management"} />
        <div className="px-5">
          {/* Summary */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: lang === "my" ? "စုစုပေါင်း" : "Total", count: users.length, filterVal: "all" },
              { label: lang === "my" ? "ပရီမီယံ" : "Premium", count: premiumCount, filterVal: "premium" },
              { label: lang === "my" ? "အလုပ်ရှင်" : "Employers", count: employerCount, filterVal: "employer" },
              { label: lang === "my" ? "လမ်းညွှန်" : "Mentors", count: mentorCount, filterVal: "mentor" },
            ].map(s => (
              <button
                key={s.filterVal}
                onClick={() => setRoleFilter(s.filterVal)}
                className={`rounded-xl border bg-card p-2.5 text-center transition-colors active:bg-muted/30 ${roleFilter === s.filterVal ? "border-primary" : "border-border"}`}
              >
                <p className="text-lg font-bold text-foreground">{s.count}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "my" ? "အမည် သို့မဟုတ် အီးမေးလ်ဖြင့် ရှာ..." : "Search by name or email..."}
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {filtered.length} {lang === "my" ? "ဦး" : "users"}
          </p>

          {/* Pagination controls */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              disabled={page === 0 || isLoading}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              {lang === "my" ? "နောက်သို့" : "Previous"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {lang === "my" ? `စာမျက်နှာ ${page + 1}` : `Page ${page + 1}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              disabled={users.length < PAGE_SIZE || isLoading}
              onClick={() => setPage(p => p + 1)}
            >
              {lang === "my" ? "ရှေ့သို့" : "Next"}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((user: any, i: number) => {
                const sysRoles = roleMap.get(user.id) || [];
                const isAdminUser = sysRoles.includes("admin");
                const isModUser = sysRoles.includes("moderator");
                const joinedDate = new Date(user.created_at).toLocaleDateString();
                return (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedId(user.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {(user.display_name || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{user.display_name || "User"}</h3>
                            {user.is_premium && <Crown className="h-3 w-3 shrink-0 text-primary" />}
                            {isAdminUser && <Shield className="h-3 w-3 shrink-0 text-destructive" />}
                            {isModUser && <ShieldCheck className="h-3 w-3 shrink-0 text-emerald" />}
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.email} · {lang === "my" ? "စတင်ရက်" : "Joined"}: {joinedDate}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[user.primary_role] || roleColors.jobseeker}`}>
                          {user.primary_role}
                        </span>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {lang === "my" ? `စတင်ရက်: ${joinedDate}` : `Joined: ${joinedDate}`}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                initial={{ y: 400 }}
                animate={{ y: 0 }}
                exit={{ y: 400 }}
                className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {(selected.display_name || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selected.display_name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[selected.primary_role] || roleColors.jobseeker}`}>
                        {selected.primary_role}
                      </span>
                      {selected.is_premium && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Premium</span>
                      )}
                      {selectedSystemRoles.includes("admin") && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Admin</span>
                      )}
                      {selectedSystemRoles.includes("moderator") && (
                        <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">Moderator</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User details */}
                <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အချက်အလက်" : "Details"}</h3>
                <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                  <p>{lang === "my" ? "တည်နေရာ" : "Location"}: {selected.location || "—"}</p>
                  <p>{lang === "my" ? "ခေါင်းစဉ်" : "Headline"}: {selected.headline || "—"}</p>
                  <p>{lang === "my" ? "ဖုန်း" : "Phone"}: {selected.phone || "—"}</p>
                  <p>{lang === "my" ? "စတင်ရက်" : "Joined"}: {new Date(selected.created_at).toLocaleDateString()}</p>
                  {selected.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selected.skills.slice(0, 8).map((s: string) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Premium toggle */}
                <div className="mb-4 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {lang === "my" ? "ပရီမီယံ အခြေအနေ" : "Premium Status"}
                      </span>
                    </div>
                    <Switch
                      checked={selected.is_premium || false}
                      onCheckedChange={() => handleTogglePremium(selected.id, selected.is_premium || false)}
                    />
                  </div>
                </div>

                {/* System role management — changes require confirmation */}
                <h3 className="mb-2 text-xs font-semibold text-foreground">
                  {lang === "my" ? "စနစ် Role" : "System Roles"}
                </h3>
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-foreground">Admin</span>
                    </div>
                    <Switch
                      checked={selectedSystemRoles.includes("admin")}
                      onCheckedChange={(checked) =>
                        requestRoleChange(selected.id, selected.display_name || "User", "admin", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald" />
                      <span className="text-sm font-medium text-foreground">Moderator</span>
                    </div>
                    <Switch
                      checked={selectedSystemRoles.includes("moderator")}
                      onCheckedChange={(checked) =>
                        requestRoleChange(selected.id, selected.display_name || "User", "moderator", checked)
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl"
                    onClick={() => { setSelectedId(null); navigate(`/profile/${selected.id}`); }}
                  >
                    <span className="mr-1.5">👁</span> {lang === "my" ? "ပရိုဖိုင်ကြည့်" : "View Profile"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 rounded-xl"
                    onClick={() => { setSelectedId(null); setDeleteConfirmId(selected.id); }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "ဖယ်ရှား" : "Remove"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role change confirmation AlertDialog */}
        <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingRoleChange?.action === "add"
                  ? (lang === "my"
                    ? `${pendingRoleChange?.role} Role ပေးမည်လား?`
                    : `Grant ${pendingRoleChange?.role} to ${pendingRoleChange?.userName}?`)
                  : (lang === "my"
                    ? `${pendingRoleChange?.role} Role ဖယ်ရှားမည်လား?`
                    : `Remove ${pendingRoleChange?.role} from ${pendingRoleChange?.userName}?`)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingRoleChange?.action === "add"
                  ? (lang === "my"
                    ? `${pendingRoleChange?.userName} ကို ${pendingRoleChange?.role} အခွင့်အာဏာ ပေးမည်။ ဆက်လုပ်မည်လား?`
                    : `This will grant ${pendingRoleChange?.role} privileges to ${pendingRoleChange?.userName}. This action can be reversed.`)
                  : (lang === "my"
                    ? `${pendingRoleChange?.userName} ထံမှ ${pendingRoleChange?.role} အခွင့်အာဏာ ရုပ်သိမ်းမည်။ ဆက်လုပ်မည်လား?`
                    : `This will remove ${pendingRoleChange?.role} privileges from ${pendingRoleChange?.userName}. This action can be reversed.`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingRoleChange(null)}>
                {lang === "my" ? "မလုပ်တော့" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmRoleChange}>
                {lang === "my" ? "အတည်ပြုရန်" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6"
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-card p-6"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="mb-2 text-base font-bold text-foreground">
                  {lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားမည်" : "Remove User"}
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  {lang === "my"
                    ? `"${userToDelete?.display_name || "ဤအသုံးပြုသူ"}" ကို ဖယ်ရှားမည်။`
                    : `You are about to permanently remove "${userToDelete?.display_name || "this user"}".`}
                </p>
                {/* Cascade impact warning */}
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
                  <p className="font-semibold">
                    {lang === "my" ? "ဤလုပ်ဆောင်မှုသည် အောက်ပါတို့ကိုလည်း ဖျက်ပစ်မည် —" : "This will also permanently delete:"}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    <li>{lang === "my" ? "ရာထူးများ / Jobs" : "Their job postings"}</li>
                    <li>{lang === "my" ? "လျှောက်လွှာများ / Applications" : "Their applications"}</li>
                    <li>{lang === "my" ? "ကြိုတင်ကြည့်ရှုမှုများ / Bookings" : "Their bookings"}</li>
                    <li>{lang === "my" ? "ငွေပေးချေမှုများ / Payments" : "Their payment records"}</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirmId(null)}>
                    {lang === "my" ? "မလုပ်တော့" : "Cancel"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    onClick={async () => {
                      let deleted = false;
                      try {
                        const { error: rpcError } = await supabase.rpc("delete_user_cascade", { target_user_id: deleteConfirmId });
                        if (rpcError) throw rpcError;
                        deleted = true;
                      } catch {
                        // RPC not available — fall back to direct profile delete
                        const { error: directError } = await supabase.from("profiles").delete().eq("id", deleteConfirmId);
                        if (!directError) {
                          deleted = true;
                          toast.warning(lang === "my" ? "သတိပေးချက်: ဆက်စပ်မှတ်တမ်းများ ကိုယ်တိုင်ဖျက်ရန် လိုအပ်နိုင်သည်" : "Note: some related records may need manual cleanup.");
                        }
                      }
                      if (deleted) {
                        toast.success(lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားပြီး" : "User removed");
                        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                      } else {
                        toast.error(lang === "my" ? "ဖယ်ရှား၍ မရပါ" : "Failed to remove user");
                      }
                      setDeleteConfirmId(null);
                    }}
                  >
                    {lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

export default AdminUsers;
