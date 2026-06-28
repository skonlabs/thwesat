import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Returns true when the current user has an active, non-expired
 * Candidate Matching Pack add-on purchase.
 */
export function useHasMatchingPack() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["has-matching-pack", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("feature_unlocks")
        .select("id, expires_at, is_active")
        .eq("user_id", user.id)
        .eq("feature_key", "matching")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .limit(1);
      if (error) return false;
      return Array.isArray(data) && data.length > 0;
    },
  });
}
