import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type JobMatch = { job_id: string; similarity: number };

/**
 * Fetches embedding-based job matches for the current seeker.
 * The edge function lazily (re)embeds the profile + missing job rows on demand,
 * then returns ranked matches via the `match_jobs_for_user` RPC.
 *
 * Returned as a Map<jobId, similarity> so callers can sort/filter their existing job lists.
 */
export function useMatchedJobs(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["matched-jobs", user?.id, limit],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min — keeps UI snappy and avoids re-embedding every navigation
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("match-jobs", {
        body: { limit },
      });
      if (error) throw error;
      const matches = (data?.matches || []) as JobMatch[];
      const map = new Map<string, number>();
      for (const m of matches) map.set(m.job_id, m.similarity);
      return { matches, scoreMap: map };
    },
  });
}
