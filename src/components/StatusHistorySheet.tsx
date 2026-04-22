import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { getApplicationStatusMeta, getJobStatusMeta } from "@/lib/status-labels";

type Kind = "application" | "job";

interface Props {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  /** application_id when kind="application", job_id when kind="job" */
  recordId: string | null;
  /** Optional title shown in the sheet header (e.g. job title or applicant name). */
  subtitle?: string;
}

interface HistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  reason_my: string | null;
  changed_by: string | null;
  created_at: string;
  changer_name?: string | null;
}

const formatDateTime = (iso: string, lang: "my" | "en") => {
  const d = new Date(iso);
  return d.toLocaleString(lang === "my" ? "my-MM" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const StatusBadge = ({ kind, status, lang }: { kind: Kind; status: string | null; lang: "my" | "en" }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
        {lang === "my" ? "စတင်" : "Created"}
      </span>
    );
  }
  const meta = kind === "application"
    ? getApplicationStatusMeta(status, "admin")
    : getJobStatusMeta(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${meta.color}`}>
      {lang === "my" ? meta.my : meta.en}
    </span>
  );
};

export default function StatusHistorySheet({ open, onClose, kind, recordId, subtitle }: Props) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(open);

  useEffect(() => { if (open) setMounted(true); }, [open]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["status-history", kind, recordId],
    enabled: !!recordId && open,
    queryFn: async (): Promise<HistoryRow[]> => {
      const table = kind === "application" ? "application_status_history" : "job_status_history";
      const idCol = kind === "application" ? "application_id" : "job_id";
      const { data, error } = await (supabase as any)
        .from(table)
        .select("id, old_status, new_status, reason, reason_my, changed_by, created_at")
        .eq(idCol, recordId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data || []) as HistoryRow[];

      // Resolve display names for changers (best-effort; ignore failures).
      const ids = Array.from(new Set(list.map(r => r.changed_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        const byId = new Map((profs || []).map((p: any) => [p.id, p.display_name as string]));
        return list.map(r => ({ ...r, changer_name: r.changed_by ? byId.get(r.changed_by) || null : null }));
      }
      return list;
    },
  });

  const items = useMemo(() => rows || [], [rows]);

  if (!mounted) return null;

  return (
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-16 z-50 bg-background rounded-t-2xl max-h-[80vh] flex flex-col"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">
                    {lang === "my" ? "အခြေအနေ မှတ်တမ်း" : "Status History"}
                  </h3>
                  {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-muted" aria-label="close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  {lang === "my" ? "မှတ်တမ်း မရှိသေးပါ" : "No history yet"}
                </p>
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {items.map((r) => {
                    const reason = lang === "my" ? (r.reason_my || r.reason) : (r.reason || r.reason_my);
                    return (
                      <li key={r.id} className="ml-4">
                        <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge kind={kind} status={r.old_status} lang={lang} />
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <StatusBadge kind={kind} status={r.new_status} lang={lang} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(r.created_at, lang)}
                          {r.changer_name && (
                            <> · {lang === "my" ? "ပြောင်းသူ" : "by"} {r.changer_name}</>
                          )}
                        </p>
                        {reason && (
                          <p className="text-sm mt-1 p-2 rounded bg-muted/50 border border-border">
                            {reason}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
