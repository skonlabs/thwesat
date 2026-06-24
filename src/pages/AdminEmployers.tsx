import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Building2, CheckCircle, XCircle, Clock, ExternalLink, Globe, Mail, Phone, Users, Pencil, Trash2, Briefcase } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const statusConfig: Record<string, { color: string; label: { en: string; my: string } }> = {
  pending: { color: "bg-warning/15 text-warning", label: { en: "Pending", my: "စစ်ဆေးရန်" } },
  verified: { color: "bg-emerald/15 text-emerald", label: { en: "Approved", my: "အတည်ပြုပြီး" } },
  approved: { color: "bg-emerald/15 text-emerald", label: { en: "Approved", my: "အတည်ပြုပြီး" } },
  rejected: { color: "bg-destructive/15 text-destructive", label: { en: "Rejected", my: "ပယ်ချပြီး" } },
};

const AdminEmployers = () => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("status");
  const initialTab = requestedTab === "pending" || requestedTab === "approved" || requestedTab === "rejected" || requestedTab === "all"
    ? requestedTab
    : "all";
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(initialTab);
  const initialRoleFilter = searchParams.get("role") === "employer" || searchParams.get("role") === "agent" ? searchParams.get("role")! : "all";
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ["admin-employers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (data || []).map((e) => e.id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at, primary_role, bio, headline, location, phone, website, languages, skills, experience, role_title")
        .in("id", ids);
      const { data: contacts } = await supabase.rpc("get_user_contacts_admin", { _ids: ids });
      const contactMap = new Map((contacts || []).map((c: any) => [c.id, c.email]));
      const profileMap = new Map((profiles || []).map((p) => [p.id, { ...p, email: contactMap.get(p.id) ?? null }]));

      return (data || []).map((emp) => ({
        ...emp,
        profile: profileMap.get(emp.id),
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      // Atomic audited RPC: updates verification_status, flips is_verified only for employer (not agent),
      // confirms email on approval, notifies the user, and writes admin_audit_log.
      const { error } = await (supabase as any).rpc("admin_verify_employer", {
        _employer_id: id,
        _status: status,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      setSelectedId(null);
      setRejecting(false);
      setRejectReason("");
      toast.success(
        vars.status === "rejected"
          ? (lang === "my" ? "ပယ်ချပြီး" : "Rejected")
          : (lang === "my" ? "အတည်ပြုပြီး" : "Approved")
      );
    },
    onError: (e: any) => toast.error(e?.message || (lang === "my" ? "မအောင်မြင်ပါ" : "Failed")),
  });

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: "verified" });
  };

  const handleReject = () => {
    if (!selectedId) return;
    updateStatus.mutate({ id: selectedId, status: "rejected", reason: rejectReason });
  };


  const handleDeleteEmployer = async (id: string) => {
    try {
      const { error } = await supabase.rpc("admin_delete_employer", { _employer_id: id });
      if (error) throw error;
      toast.success(lang === "my" ? "အလုပ်ရှင် ဖျက်ပြီး" : "Employer deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-employers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
    } catch (err: any) {
      toast.error(lang === "my" ? "ဖျက်၍ မရပါ" : `Failed to delete employer: ${err?.message || "unknown error"}`);
    }
    setDeleteConfirmId(null);
    setSelectedId(null);
  };

  // Fetch total job counts for all employers (all statuses)
  const employerIds = employers.map((e: any) => e.id);
  const { data: jobCountsRaw = [] } = useQuery({
    queryKey: ["employer-job-counts", employerIds],
    queryFn: async () => {
      if (employerIds.length === 0) return [];
      const { data } = await supabase
        .from("jobs")
        .select("employer_id")
        .in("employer_id", employerIds);
      return data || [];
    },
    enabled: employerIds.length > 0,
  });
  const jobCountMap = new Map<string, number>();
  (jobCountsRaw as any[]).forEach((row: any) => {
    jobCountMap.set(row.employer_id, (jobCountMap.get(row.employer_id) || 0) + 1);
  });

  const filtered = employers.filter((e: any) => {
    const status = e.verification_status || "pending";
    const matchesTab = tab === "all" 
      || (tab === "approved" && (status === "verified" || status === "approved"))
      || (tab !== "approved" && status === tab);
    const role = e.profile?.primary_role || "employer";
    const matchesRole = roleFilter === "all" || role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || (e.company_name || "").toLowerCase().includes(q) || (e.profile?.display_name || "").toLowerCase().includes(q) || (e.profile?.email || "").toLowerCase().includes(q);
    return matchesTab && matchesRole && matchesSearch;
  });

  const selected = employers.find((e: any) => e.id === selectedId);
  const pendingCount = employers.filter((e: any) => (e.verification_status || "pending") === "pending").length;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် & ခေါ်ယူရေး စီမံခန့်ခွဲ" : "Employers & Recruiters"} showBack />
      <div className="px-5">
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 text-xs">
              {lang === "my" ? "စစ်ဆေးရန်" : "Pending"} {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 text-xs">{lang === "my" ? "အတည်ပြုပြီး" : "Approved"}</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 text-xs">{lang === "my" ? "ပယ်ချပြီး" : "Rejected"}</TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs">{lang === "my" ? "အားလုံး" : "All"}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Role filter chips */}
        <div className="mb-4 flex gap-2">
          {[
            { v: "all", label: { en: "All", my: "အားလုံး" } },
            { v: "employer", label: { en: "Employers", my: "အလုပ်ရှင်" } },
            { v: "agent", label: { en: "Recruiters", my: "ခေါ်ယူရေး" } },
          ].map((r) => (
            <button
              key={r.v}
              onClick={() => setRoleFilter(r.v)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                roleFilter === r.v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {lang === "my" ? r.label.my : r.label.en}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "my" ? "ကုမ္ပဏီ သို့ အီးမေးလ်ဖြင့် ရှာ..." : "Search company or email..."} className="h-10 rounded-xl pl-9" />
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ခု" : "employers"}</p>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">{lang === "my" ? "ရလဒ် မရှိပါ" : "No employers found"}</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((emp: any, i: number) => {
              const st = statusConfig[(emp.verification_status || "pending")] || statusConfig.pending;
              const isAgent = emp.profile?.primary_role === "agent";
              const roleLabel = isAgent
                ? (lang === "my" ? "ခေါ်ယူရေး" : "Recruiter")
                : (lang === "my" ? "အလုပ်ရှင်" : "Employer");
              return (
                <motion.button key={emp.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedId(emp.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left active:bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-foreground">{emp.company_name || emp.profile?.display_name || emp.profile?.email || "Unnamed"}</h3>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isAgent ? "bg-accent/20 text-gold-dark" : "bg-primary/10 text-primary"}`}>
                        {roleLabel}
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{emp.profile?.email || emp.profile?.display_name} · {emp.industry || "—"}</p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <Briefcase className="h-3 w-3" strokeWidth={1.5} />
                      {jobCountMap.get(emp.id) || 0} {lang === "my" ? "စုစုပေါင်းအလုပ်" : "total jobs"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                    {lang === "my" ? st.label.my : st.label.en}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {selected && !rejecting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.company_name || selected.profile?.display_name || selected.profile?.email || "Unnamed"}</h2>
                  <p className="text-xs text-muted-foreground">{selected.profile?.email}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${(statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).color}`}>
                    {lang === "my" ? (statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).label.my : (statusConfig[(selected.verification_status || "pending")] || statusConfig.pending).label.en}
                  </span>
                </div>
              </div>

              {(() => {
                const isAgent = selected.profile?.primary_role === "agent";
                const dash = "—";
                const L = (en: string, my: string) => (lang === "my" ? my : en);
                const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
                  <div className="flex items-start gap-2 text-xs">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="min-w-[110px] shrink-0 text-muted-foreground">{label}</span>
                    <span className="flex-1 break-words text-foreground">{value || <span className="text-muted-foreground/60">{dash}</span>}</span>
                  </div>
                );
                const p: any = selected.profile || {};
                return (
                  <>
                    <div className="mb-4">
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{L("Account", "အကောင့်")}</h3>
                      <div className="space-y-1.5">
                        <Row icon={Users} label={L("Name", "အမည်")} value={p.display_name} />
                        <Row icon={Mail} label={L("Email", "အီးမေးလ်")} value={p.email} />
                        <Row icon={Phone} label={L("Phone", "ဖုန်း")} value={p.phone} />
                        <Row icon={Globe} label={L("Location", "နေရာ")} value={p.location} />
                        <Row icon={Briefcase} label={L("Role", "အခန်းကဏ္ဍ")} value={isAgent ? L("Recruiter", "ခေါ်ယူရေး") : L("Employer", "အလုပ်ရှင်")} />
                        <Row icon={Clock} label={L("Joined", "စတင်ရက်")} value={new Date(p.created_at || selected.created_at).toLocaleDateString()} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {isAgent ? L("Agency Details", "အေဂျင်စီ အချက်အလက်") : L("Company Details", "ကုမ္ပဏီ အချက်အလက်")}
                      </h3>
                      <div className="space-y-1.5">
                        <Row icon={Building2} label={isAgent ? L("Agency Name", "အေဂျင်စီအမည်") : L("Company", "ကုမ္ပဏီ")} value={selected.company_name} />
                        <Row icon={Building2} label={L("Industry", "လုပ်ငန်း")} value={selected.industry} />
                        <Row icon={Globe} label={L("HQ Country", "ရုံးချုပ်နိုင်ငံ")} value={selected.hq_country} />
                        <Row icon={Users} label={L("Company Size", "အရွယ်အစား")} value={selected.company_size} />
                        <Row icon={Globe} label={L("Website", "ဝက်ဘ်ဆိုက်")} value={selected.company_website ? (
                          <a href={selected.company_website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{selected.company_website}</a>
                        ) : null} />
                        <Row icon={ExternalLink} label="LinkedIn" value={selected.company_linkedin ? (
                          <a href={selected.company_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary underline">{selected.company_linkedin}</a>
                        ) : null} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{L("Primary Contact", "အဓိက ဆက်သွယ်ရန်")}</h3>
                      <div className="space-y-1.5">
                        <Row icon={Users} label={L("Contact Name", "အမည်")} value={selected.contact_name} />
                        <Row icon={Mail} label={L("Contact Email", "အီးမေးလ်")} value={selected.contact_email} />
                        <Row icon={Phone} label={L("Contact Phone", "ဖုန်း")} value={selected.contact_phone} />
                      </div>
                    </div>

                    {(selected.company_description || p.bio || p.headline) && (
                      <div className="mb-4 space-y-3">
                        {p.headline && (
                          <div>
                            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{L("Headline", "ခေါင်းစဉ်")}</h3>
                            <p className="text-xs text-foreground leading-relaxed">{p.headline}</p>
                          </div>
                        )}
                        {selected.company_description && (
                          <div>
                            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{L("Description", "ဖော်ပြချက်")}</h3>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{selected.company_description}</p>
                          </div>
                        )}
                        {p.bio && (
                          <div>
                            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{L("Bio", "ကိုယ်ရေးအကျဉ်း")}</h3>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{p.bio}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {(selected.verification_status || "pending") === "pending" && (
                <div className="flex gap-3">
                  <Button onClick={() => handleApprove(selected.id)} className="flex-1 rounded-xl" size="sm">
                    <CheckCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "အတည်ပြု" : "Approve"}
                  </Button>
                  <Button variant="outline" onClick={() => setRejecting(true)} className="flex-1 rounded-xl border-destructive text-destructive" size="sm">
                    <XCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "ပယ်ချ" : "Reject"}
                  </Button>
                </div>
              )}

              {(selected.verification_status || "pending") === "rejected" && (
                <Button onClick={() => handleApprove(selected.id)} className="w-full rounded-xl" size="sm">
                  <CheckCircle className="mr-1.5 h-4 w-4" />{lang === "my" ? "ပြန်အတည်ပြု" : "Re-approve"}
                </Button>
              )}

              {/* Delete action */}
              <div className="mt-4 border-t border-border pt-4">
                <Button variant="destructive" size="sm" className="w-full rounded-xl" onClick={() => { setSelectedId(null); setDeleteConfirmId(selected.id); }}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />{lang === "my" ? "ဖျက်ရန်" : "Delete"}
                </Button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejecting && selectedId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setRejecting(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "ပယ်ချရန် အကြောင်းပြ" : "Rejection Reason"}</h3>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={lang === "my" ? "အကြောင်းပြချက် ရေးပါ..." : "Enter reason..."} className="mb-4 rounded-xl" rows={3} />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejecting(false)} className="flex-1 rounded-xl" size="sm">{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" onClick={handleReject} className="flex-1 rounded-xl" size="sm" disabled={updateStatus.isPending || !rejectReason || rejectReason.trim() === ""}>{lang === "my" ? "ပယ်ချ" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "my" ? "အလုပ်ရှင် ဖျက်မည်" : "Delete Employer"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "my" ? "ဤအလုပ်ရှင်ပရိုဖိုင်ကို ဖျက်မည်။ ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။" : "This will permanently delete the employer profile. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>
              {lang === "my" ? "မလုပ်တော့" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDeleteEmployer(deleteConfirmId)}
            >
              {lang === "my" ? "ဖျက်ရန်" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmployers;
