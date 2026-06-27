import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Crown, Trash2, Shield, MessageCircle, Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useUserRoles } from "@/hooks/use-user-roles";
import { useStartConversation } from "@/hooks/use-start-conversation";

const roleColors: Record<string, string> = {
  job_seeker: "bg-muted text-muted-foreground",
  employer: "bg-primary/10 text-primary",
  agent: "bg-accent/15 text-accent-foreground",
  mentor: "bg-emerald/10 text-emerald",
};

interface PendingRoleChange {
  userId: string;
  userName: string;
  role: "admin" | "partner";
  action: "add" | "remove";
}

const PAGE_SIZE = 100;

const AdminUsers = () => {
  const { lang } = useLanguage();
  const { isAdmin, isPartner } = useUserRoles();
  const canMessage = isAdmin || isPartner;
  const { startConversation } = useStartConversation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "all";
  const initialQuery = searchParams.get("q") || "";
  const [search, setSearch] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [page, setPage] = useState(0);
  const [draftRoles, setDraftRoles] = useState<Set<string>>(new Set());
  const [draftSuspended, setDraftSuspended] = useState<boolean>(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const queryClient = useQueryClient();

  // Debounce the search input so the query doesn't re-fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);


  // Sync URL ?role= / ?q= → filter (so dashboard deep links work and reload preserves it)
  useEffect(() => {
    const urlRole = searchParams.get("role") || "all";
    if (urlRole !== roleFilter) setRoleFilter(urlRole);
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== search) {
      setSearch(urlQuery);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(0);
    const next = new URLSearchParams(searchParams);
    if (val === "all") next.delete("role"); else next.set("role", val);
    setSearchParams(next, { replace: true });
  };

  const updateSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    const next = new URLSearchParams(searchParams);
    if (!val) next.delete("q"); else next.set("q", val);
    setSearchParams(next, { replace: true });
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", page, debouncedSearch],
    staleTime: 30_000,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      // If searching, look up matching user_ids from profiles (display_name + email).
      let matchedIds: string[] | null = null;
      const q = debouncedSearch.trim();
      if (q) {
        const [{ data: byName }, emailRowsResp] = await Promise.all([
          supabase.from("profiles").select("id").ilike("display_name", `%${q}%`).limit(500),
          (async () => {
            try {
              return await (supabase as any).from("profiles").select("id").ilike("email", `%${q}%`).limit(500);
            } catch {
              return { data: [] as any[] };
            }
          })(),
        ]);
        const emailMatchIds = ((emailRowsResp as any)?.data || []).map((r: any) => r.id);
        matchedIds = Array.from(new Set([...(byName || []).map((r: any) => r.id), ...emailMatchIds]));
        if (matchedIds.length === 0) return [];
      }
      let qb = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, headline, bio, location, created_at, skills, languages, is_suspended")
        .order("created_at", { ascending: false });
      if (matchedIds) qb = qb.in("id", matchedIds);
      const { data, error } = await qb.range(from, to);
      if (error) throw error;
      const ids = (data || []).map((u: any) => u.id);
      let contactMap = new Map<string, { email: string | null; phone: string | null }>();
      let roleMap = new Map<string, string>();
      if (ids.length) {
        const [{ data: contacts }, { data: roleRows }] = await Promise.all([
          supabase.rpc("get_user_contacts_admin", { _ids: ids }),
          supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        ]);
        contactMap = new Map((contacts || []).map((c: any) => [c.id, { email: c.email, phone: c.phone }]));
        roleMap = new Map((roleRows || []).map((r: any) => [r.user_id, r.role]));
      }
      let rows = (data || []).map((u: any) => ({
        ...u,
        primary_role: roleMap.get(u.id) ?? null,
        email: contactMap.get(u.id)?.email ?? null,
        phone: contactMap.get(u.id)?.phone ?? null,
      }));
      if (q) {
        const ql = q.toLowerCase();
        rows = rows.filter((u: any) =>
          (u.display_name || "").toLowerCase().includes(ql) ||
          (u.email || "").toLowerCase().includes(ql)
        );
      }
      return rows;
    },
  });

  // Fetch system roles for all users
  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-user-roles"],
    staleTime: 60_000,
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
      u.primary_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const selected: any = users.find((u: any) => u.id === selectedId);
  const selectedSystemRoles = selected ? roleMap.get(selected.id) || [] : [];

  // Sync draft state whenever a different user is opened or role data refreshes
  useEffect(() => {
    if (selected) {
      setDraftRoles(new Set(roleMap.get(selected.id) || []));
      setDraftSuspended(!!selected.is_suspended);
    } else {
      setDraftRoles(new Set());
      setDraftSuspended(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, allRoles, selected?.is_suspended]);

  const initialRoles = new Set(selectedSystemRoles);
  const rolesChanged =
    selected &&
    (draftRoles.size !== initialRoles.size ||
      [...draftRoles].some((r) => !initialRoles.has(r)));
  const suspendChanged = selected && draftSuspended !== !!selected.is_suspended;
  const hasUnsavedChanges = !!(rolesChanged || suspendChanged);

  const seekerCount = users.filter((u: any) => u.primary_role === "job_seeker").length;
  const employerCount = users.filter((u: any) => u.primary_role === "employer").length;
  const agentCount = users.filter((u: any) => u.primary_role === "agent").length;
  const mentorCount = users.filter((u: any) => u.primary_role === "mentor").length;

  /** Called when the admin clicks a role Switch — shows a confirmation dialog instead of acting immediately */
  const requestRoleChange = (
    userId: string,
    userName: string,
    role: "admin" | "partner",
    checked: boolean
  ) => {
    setPendingRoleChange({ userId, userName, role, action: checked ? "add" : "remove" });
  };

  const toggleSuspend = async (userId: string, suspend: boolean) => {
    const { error } = await supabase.rpc("set_user_suspended" as any, { _user_id: userId, _suspended: suspend });
    if (error) {
      toast.error(error.message || "Failed to update suspend status");
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
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
      const { error } = await supabase.rpc("revoke_user_role" as any, { _user_id: userId, _role: role });
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
      <div className="min-h-dvh bg-background pb-24">
        <PageHeader title={lang === "my" ? "အသုံးပြုသူ စီမံခန့်ခွဲ" : "User Management"} />
        <div className="px-5">
          {/* Summary */}
          <div className="mb-4 grid grid-cols-5 gap-2">
            {[
              { label: lang === "my" ? "စုစုပေါင်း" : "All", count: users.length, filterVal: "all" },
              { label: lang === "my" ? "အလုပ်ရှာ" : "Seekers", count: seekerCount, filterVal: "job_seeker" },
              { label: lang === "my" ? "အလုပ်ရှင်" : "Employers", count: employerCount, filterVal: "employer" },
              { label: lang === "my" ? "အေဂျင့်" : "Agents", count: agentCount, filterVal: "agent" },
              { label: lang === "my" ? "လမ်းညွှန်" : "Mentors", count: mentorCount, filterVal: "mentor" },
            ].map(s => (
              <button
                key={s.filterVal}
                onClick={() => updateRoleFilter(s.filterVal)}
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
              onChange={e => updateSearch(e.target.value)}
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
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((user: any, i: number) => {
                const sysRoles = roleMap.get(user.id) || [];
                const isAdminUser = sysRoles.includes("admin");
                const joinedDate = new Date(user.created_at).toLocaleDateString();
                return (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/20"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(user.id)}
                          className="flex flex-1 min-w-0 items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {(user.display_name || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-foreground">{user.display_name || "User"}</h3>
                              {isAdminUser && <Shield className="h-3 w-3 shrink-0 text-destructive" />}
                            </div>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {user.email || (lang === "my" ? "အီးမေးလ် မရှိ" : "no email")} · {lang === "my" ? "စတင်ရက်" : "Joined"}: {joinedDate}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[user.primary_role] || roleColors.job_seeker}`}>
                            {user.primary_role}
                          </span>
                        </button>
                        {canMessage && (
                          <div className="flex shrink-0 items-center gap-1">
                            {user.email && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard?.writeText(user.email);
                                  toast.success(lang === "my" ? "အီးမေးလ် ကူးယူပြီး" : "Email copied");
                                }}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Copy email"
                              >
                                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startConversation(user.id);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              aria-label="Message user"
                            >
                              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </motion.div>
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
              className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4 md:p-6"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl max-h-[90vh]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start gap-3 border-b border-border p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {(selected.display_name || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-foreground">{selected.display_name || "User"}</h2>
                    <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[selected.primary_role] || roleColors.job_seeker}`}>
                        {selected.primary_role}
                      </span>
                      {selectedSystemRoles.includes("admin") && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Admin</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Details */}
                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {lang === "my" ? "အချက်အလက်" : "Details"}
                    </h3>
                    <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs">
                      <dt className="text-muted-foreground">{lang === "my" ? "တည်နေရာ" : "Location"}</dt>
                      <dd className="text-foreground truncate">{selected.location || "—"}</dd>
                      <dt className="text-muted-foreground">{lang === "my" ? "ခေါင်းစဉ်" : "Headline"}</dt>
                      <dd className="text-foreground truncate">{selected.headline || "—"}</dd>
                      <dt className="text-muted-foreground">{lang === "my" ? "ဖုန်း" : "Phone"}</dt>
                      <dd className="text-foreground">{selected.phone || "—"}</dd>
                      <dt className="text-muted-foreground">{lang === "my" ? "စတင်ရက်" : "Joined"}</dt>
                      <dd className="text-foreground">{new Date(selected.created_at).toLocaleDateString()}</dd>
                    </dl>
                    {selected.skills?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {selected.skills.slice(0, 8).map((s: string) => (
                          <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* System roles */}
                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {lang === "my" ? "စနစ် Role" : "System Roles"}
                    </h3>
                    <div className="divide-y divide-border rounded-xl border border-border">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-foreground">Admin</span>
                        </div>
                        <Switch
                          checked={draftRoles.has("admin")}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => {
                            const next = new Set(draftRoles);
                            checked ? next.add("admin") : next.delete("admin");
                            setDraftRoles(next);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium text-foreground">Partner</span>
                        </div>
                        <Switch
                          checked={draftRoles.has("partner")}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => {
                            const next = new Set(draftRoles);
                            checked ? next.add("partner") : next.delete("partner");
                            setDraftRoles(next);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-foreground">{lang === "my" ? "ရပ်ဆိုင်းထား" : "Suspended"}</span>
                        </div>
                        <Switch
                          checked={draftSuspended}
                          disabled={!isAdmin}
                          onCheckedChange={(checked) => setDraftSuspended(checked)}
                        />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Sticky footer */}
                <div className="flex flex-wrap gap-2 border-t border-border bg-card p-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 rounded-xl"
                    disabled={!hasUnsavedChanges || savingChanges || !isAdmin}
                    onClick={async () => {
                      if (!selected) return;
                      setSavingChanges(true);
                      const initial = new Set(roleMap.get(selected.id) || []);
                      const toAdd = [...draftRoles].filter((r) => !initial.has(r));
                      const toRemove = [...initial].filter((r) => !draftRoles.has(r));
                      let hadError = false;
                      for (const role of toAdd) {
                        const { error } = await supabase.rpc("set_user_role", { _user_id: selected.id, _role: role as any });
                        if (error) { hadError = true; toast.error(`Failed to add ${role}: ${error.message}`); }
                      }
                      for (const role of toRemove) {
                        const { error } = await supabase.rpc("revoke_user_role" as any, { _user_id: selected.id, _role: role });
                        if (error) { hadError = true; toast.error(`Failed to remove ${role}: ${error.message}`); }
                      }
                      if (suspendChanged) {
                        const { error } = await supabase.rpc("set_user_suspended" as any, { _user_id: selected.id, _suspended: draftSuspended });
                        if (error) { hadError = true; toast.error(error.message || "Failed to update suspend status"); }
                      }
                      await queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
                      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                      setSavingChanges(false);
                      if (!hadError) toast.success(lang === "my" ? "သိမ်းဆည်းပြီး" : "Changes saved");
                    }}
                  >
                    {savingChanges ? (lang === "my" ? "သိမ်းနေသည်…" : "Saving…") : (lang === "my" ? "သိမ်းမည်" : "Save")}
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1 rounded-xl"
                    onClick={() => { setSelectedId(null); navigate(`/profile/${selected.id}`); }}
                  >
                    {lang === "my" ? "ပရိုဖိုင်ကြည့်" : "View Profile"}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 rounded-xl"
                      onClick={() => { setSelectedId(null); setDeleteConfirmId(selected.id); }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "ဖယ်ရှား" : "Remove"}
                    </Button>

                  )}
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
                      if (!deleteConfirmId) return;
                      const { error } = await supabase.rpc("delete_user_cascade", { _target_user_id: deleteConfirmId });
                      if (error) {
                        toast.error(lang === "my" ? "ဖယ်ရှား၍ မရပါ" : `Failed to remove user: ${error.message}`);
                      } else {
                        toast.success(lang === "my" ? "အသုံးပြုသူ ဖယ်ရှားပြီး" : "User removed");
                        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
