import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, X, ExternalLink, MapPin, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useHasMatchingPack } from "@/hooks/use-matching-pack";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const REJECT_THRESHOLD = 5; // ≥ this many rejects out of visible → unlock "Show next"

type Match = { seeker_user_id: string; similarity: number };
type Profile = {
  id: string; display_name: string | null; headline: string | null;
  bio: string | null; location: string | null; avatar_url: string | null;
  skills: string[] | null; experience: string | null;
};

const EmployerJobMatches = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: hasPack, isLoading: packLoading } = useHasMatchingPack();
  const my = lang === "my";

  const isAgent = typeof window !== "undefined" && window.location.pathname.startsWith("/agent");
  const backPath = isAgent ? "/agent/jobs" : "/employer/jobs";

  // Job header info
  const { data: job } = useQuery({
    queryKey: ["job-min", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id, title, title_my, company, location").eq("id", jobId).maybeSingle();
      return data;
    },
  });

  // Server matches (top 30 unranked-by-the-server, already excludes rejections)
  const { data: matchesResp, isLoading: loadingMatches, isFetching, refetch, error: matchError } = useQuery({
    queryKey: ["job-candidate-matches", jobId, user?.id],
    enabled: !!jobId && !!user && hasPack === true,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-candidates", {
        body: { job_id: jobId, limit: 60 },
      });
      if (error) throw error;
      return data as { matches: Match[] };
    },
  });

  // Fetched profiles for the matches
  const matchIds = (matchesResp?.matches || []).map((m) => m.seeker_user_id);
  const { data: profiles = [] } = useQuery({
    queryKey: ["match-profiles", matchIds.sort().join(",")],
    enabled: matchIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, headline, bio, location, avatar_url, skills, experience")
        .in("id", matchIds);
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  // Window of visible candidates: take first PAGE_SIZE that aren't yet rejected in this session.
  const [sessionRejected, setSessionRejected] = useState<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0); // index in matches array of next candidate to pull in

  // Initialise visible window when matches arrive.
  useEffect(() => {
    if (!matchesResp?.matches) return;
    const first = matchesResp.matches.slice(0, PAGE_SIZE).map((m) => m.seeker_user_id);
    setVisibleIds(first);
    setCursor(first.length);
    setSessionRejected(new Set());
  }, [matchesResp]);

  const rejectedCountVisible = visibleIds.filter((id) => sessionRejected.has(id)).length;
  const remainingPool = (matchesResp?.matches || []).slice(cursor).map((m) => m.seeker_user_id);
  const canShowNext = rejectedCountVisible >= REJECT_THRESHOLD && remainingPool.length > 0;

  const handleReject = async (seekerId: string) => {
    if (!jobId || !user) return;
    // optimistic UI
    setSessionRejected((s) => new Set(s).add(seekerId));
    try {
      await (supabase as any).from("job_candidate_rejections").insert({
        employer_user_id: user.id,
        job_id: jobId,
        seeker_user_id: seekerId,
      });
    } catch (err: any) {
      // If unique-conflict, ignore. Otherwise revert.
      if (!String(err?.message || "").includes("duplicate")) {
        setSessionRejected((s) => {
          const n = new Set(s); n.delete(seekerId); return n;
        });
        toast.error(my ? "ပယ်ဖျက်၍ မရပါ" : "Could not reject");
      }
    }
  };

  const handleShowNext = () => {
    const keep = visibleIds.filter((id) => !sessionRejected.has(id));
    const need = PAGE_SIZE - keep.length;
    const all = matchesResp?.matches || [];
    const next = all.slice(cursor, cursor + need).map((m) => m.seeker_user_id);
    setVisibleIds([...keep, ...next]);
    setCursor(cursor + next.length);
    // Drop the just-rejected ids from session set so the next batch starts fresh.
    setSessionRejected((s) => {
      const n = new Set(s);
      visibleIds.forEach((id) => { if (n.has(id) && !keep.includes(id)) n.delete(id); });
      return n;
    });
  };

  const handleRefresh = async () => {
    qc.invalidateQueries({ queryKey: ["job-candidate-matches", jobId, user?.id] });
    await refetch();
  };

  // Gate UI: no pack
  if (!packLoading && hasPack === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <PageHeader title={my ? "ကိုက်ညီသော ကိုယ်စားလှယ်များ" : "Matched candidates"} onBack={() => navigate(backPath)} />
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-accent" />
          <h2 className="mt-2 text-base font-bold">{my ? "Candidate Matching Pack လိုအပ်" : "Candidate Matching Pack required"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {my
              ? "သင့်အလုပ်နှင့် အကိုက်ညီဆုံး အလုပ်ရှာသူများကို ဖော်ပြရန် Candidate Matching Pack ဝယ်ပါ။"
              : "Buy the Candidate Matching Pack to see the best-matched candidates for this job."}
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/pricing")}>
            {my ? "Pricing သို့ သွားရန်" : "Go to Pricing"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="-ml-2 h-8 rounded-lg px-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> {my ? "နောက်သို့" : "Back"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="h-8 rounded-lg">
          {isFetching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
          {my ? "ပြန်ဆန်း" : "Refresh"}
        </Button>
      </div>

      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          {my ? "ကိုက်ညီသော ကိုယ်စားလှယ်များ" : "Matched candidates"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {(my && job?.title_my) || job?.title} {job?.company ? `· ${job.company}` : ""}
        </p>
      </div>

      {(loadingMatches || packLoading) && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {matchError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {my ? "ကိုက်ညီသူများ ရှာ၍ မရပါ။" : "Could not load matches."} {(matchError as Error)?.message}
        </div>
      )}

      {!loadingMatches && matchesResp && visibleIds.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {my ? "လောလောဆယ် ကိုက်ညီသူ မရှိသေးပါ။" : "No matches yet. Check back later as more candidates join."}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {visibleIds.map((seekerId) => {
          const p = profileById.get(seekerId);
          const m = matchesResp?.matches.find((x) => x.seeker_user_id === seekerId);
          const rejected = sessionRejected.has(seekerId);
          const pct = m ? Math.round(Math.max(0, Math.min(1, m.similarity)) * 100) : 0;
          return (
            <motion.div
              key={seekerId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: rejected ? 0.5 : 1, y: 0 }}
              className={`rounded-xl border bg-card p-3 ${rejected ? "border-dashed border-muted" : "border-border"}`}
            >
              <div className="flex items-start gap-3">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {(p?.display_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p?.display_name || (my ? "အမည်မဖော်" : "Anonymous")}
                    </p>
                    <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">
                      {pct}% {my ? "ကိုက်ညီ" : "match"}
                    </span>
                  </div>
                  {p?.headline && <p className="truncate text-[11px] text-muted-foreground">{p.headline}</p>}
                  {p?.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  )}
                  {Array.isArray(p?.skills) && p.skills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.skills.slice(0, 6).map((s) => (
                        <span key={s} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg px-2 text-[11px]"
                    onClick={() => window.open(`/profile/${seekerId}`, "_blank")}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> {my ? "ပရိုဖိုင်" : "Profile"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg px-2 text-[11px] text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(seekerId)}
                    disabled={rejected}
                  >
                    <X className="mr-1 h-3 w-3" /> {rejected ? (my ? "ပယ်ပြီး" : "Rejected") : (my ? "ပယ်ဖျက်" : "Reject")}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {visibleIds.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <Button
            className="rounded-xl"
            onClick={handleShowNext}
            disabled={!canShowNext}
          >
            {my ? "နောက်ထပ် ပြ" : "Show next matches"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            {canShowNext
              ? (my
                ? `${rejectedCountVisible} ဦးကို ပယ်ထား - နောက်ထပ် ပြသနိုင်ပါပြီ`
                : `${rejectedCountVisible} rejected — ready to show next batch`)
              : (my
                ? `နောက်ထပ်ဖော်ပြရန် ${REJECT_THRESHOLD} ဦးထက် ပိုပယ်ပါ`
                : `Reject at least ${REJECT_THRESHOLD} of the visible ${PAGE_SIZE} to load the next batch`)}
          </p>
          {remainingPool.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              {my ? "ကိုက်ညီသူ အားလုံး ပြသပြီးပါပြီ" : "All available matches shown."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployerJobMatches;
