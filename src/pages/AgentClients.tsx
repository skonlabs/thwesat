import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Upload, Building2, Pencil, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  useAgentClients,
  useUpsertAgentClient,
  useDeleteAgentClient,
  uploadAgentClientLogo,
  type AgentClient,
} from "@/hooks/use-agent-clients";

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  logo_url: "",
  website: "",
  industry: "",
  notes: "",
};

const AgentClients = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: clients = [], isLoading } = useAgentClients();
  const upsert = useUpsertAgentClient();
  const del = useDeleteAgentClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: AgentClient) => {
    setForm({
      id: c.id,
      name: c.name || "",
      logo_url: c.logo_url || "",
      website: c.website || "",
      industry: c.industry || "",
      notes: c.notes || "",
    });
    setOpen(true);
  };

  const handleLogoFile = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(lang === "my" ? "ဖိုင် 2MB ထက် ကြီးနေသည်" : "File must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAgentClientLogo(user.id, file);
      setForm((f) => ({ ...f, logo_url: url }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(lang === "my" ? "ကုမ္ပဏီ အမည် ထည့်ပါ" : "Company name is required");
      return;
    }
    try {
      await upsert.mutateAsync(form);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<AgentClient | null>(null);
  const [linkedJobsCount, setLinkedJobsCount] = useState<number | null>(null);
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleDelete = async (c: AgentClient) => {
    setDeleteTarget(c);
    setLinkedJobsCount(null);
    setCheckingLinks(true);
    const { count, error } = await (supabase as any)
      .from("jobs")
      .select("id", { head: true, count: "exact" })
      .eq("agent_client_id", c.id);
    setCheckingLinks(false);
    if (error) {
      setLinkedJobsCount(0);
      return;
    }
    setLinkedJobsCount(count ?? 0);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setLinkedJobsCount(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader
        title={lang === "my" ? "သုံးစွဲသူ ကုမ္ပဏီများ" : "Client Companies"}
        backPath="/profile"
      />
      <div className="px-5 pt-2">
        <p className="mb-4 text-xs text-muted-foreground">
          {lang === "my"
            ? "သင်ကိုယ်စားပြုသော ကုမ္ပဏီများကို စီမံပါ။ အလုပ်တင်သည့်အခါ ရွေးချယ်နိုင်ပါသည်။"
            : "Manage the companies you represent. You can pick one when posting a job."}
        </p>

        <Button onClick={openNew} className="mb-4 w-full rounded-xl" size="lg">
          <Plus className="mr-1.5 h-4 w-4" />
          {lang === "my" ? "ကုမ္ပဏီ ထည့်ရန်" : "Add Company"}
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              {lang === "my" ? "ကုမ္ပဏီ မရှိသေးပါ" : "No clients yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  {c.industry && (
                    <p className="truncate text-[11px] text-muted-foreground">{c.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground active:bg-muted"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive active:bg-destructive/10"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                <h3 className="text-base font-bold text-foreground">
                  {lang === "my" ? "ကုမ္ပဏီ ဖျက်မည်" : "Delete client"}
                </h3>
              </div>
              {checkingLinks || linkedJobsCount === null ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  {lang === "my" ? "စစ်ဆေးနေသည်..." : "Checking linked jobs..."}
                </p>
              ) : linkedJobsCount > 0 ? (
                <>
                  <p className="mb-2 text-sm text-foreground">
                    {lang === "my"
                      ? `${deleteTarget.name} သည် အလုပ်ခေါ်စာ ${linkedJobsCount} ခုနှင့် ချိတ်ဆက်ထားသည်။`
                      : `${deleteTarget.name} is linked to ${linkedJobsCount} job listing${linkedJobsCount === 1 ? "" : "s"}.`}
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    {lang === "my"
                      ? "ဖျက်လျှင် အဆိုပါအလုပ်များ၏ ကုမ္ပဏီ အညွှန်း ပျက်သွားမည်။ ဦးစွာ အလုပ်ခေါ်စာများကို ပြင်ဆင်ပါ။"
                      : "Deleting will leave those listings with a missing client name. Please reassign or close those jobs first."}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setDeleteTarget(null)}
                  >
                    {lang === "my" ? "ပိတ်" : "OK"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {lang === "my"
                      ? `"${deleteTarget.name}" ကို အပြီးတိုင် ဖျက်မည်။ ပြန်ပြင်၍ မရပါ။`
                      : `Permanently delete "${deleteTarget.name}"? This cannot be undone.`}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => setDeleteTarget(null)}
                    >
                      {lang === "my" ? "မလုပ်တော့" : "Cancel"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={confirmDelete}
                      disabled={del.isPending}
                    >
                      {lang === "my" ? "ဖျက်ရန်" : "Delete"}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="bottom-16 mx-auto max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {form.id
                ? lang === "my"
                  ? "ကုမ္ပဏီ ပြင်ဆင်ရန်"
                  : "Edit Company"
                : lang === "my"
                ? "ကုမ္ပဏီ ထည့်ရန်"
                : "Add Company"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">
                {lang === "my" ? "လိုဂို" : "Logo"}
              </label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {uploading
                      ? lang === "my"
                        ? "တင်နေသည်..."
                        : "Uploading..."
                      : lang === "my"
                      ? "လိုဂို တင်ရန်"
                      : "Upload logo"}
                  </Button>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                      className="block text-[11px] text-destructive underline"
                    >
                      {lang === "my" ? "ဖယ်ရှား" : "Remove"}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {lang === "my" ? "ကုမ္ပဏီ အမည် *" : "Company Name *"}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {lang === "my" ? "လုပ်ငန်းနယ်ပယ်" : "Industry"}
              </label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder={lang === "my" ? "ဥပမာ - နည်းပညာ" : "e.g. Technology"}
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {lang === "my" ? "ဝက်ဘ်ဆိုက်" : "Website"}
              </label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {lang === "my" ? "ကိုယ်ပိုင် မှတ်ချက် (ပြင်ပ မမြင်)" : "Private notes (not shown to job seekers)"}
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 rounded-xl"
                onClick={() => setOpen(false)}
              >
                {lang === "my" ? "ပယ်ဖျက်" : "Cancel"}
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1 rounded-xl"
                onClick={handleSave}
                disabled={upsert.isPending}
              >
                {upsert.isPending
                  ? lang === "my"
                    ? "သိမ်းနေသည်..."
                    : "Saving..."
                  : lang === "my"
                  ? "သိမ်းရန်"
                  : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AgentClients;
