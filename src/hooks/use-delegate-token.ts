import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface DelegateToken {
  id: string;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  created_at: string | null;
  permissions: string[] | null;
}

export const useActiveDelegateToken = () => {
  const { user } = useAuth();
  return useQuery<DelegateToken | null>({
    queryKey: ["delegate-token", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delegate_tokens")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as DelegateToken | null) ?? null;
    },
  });
};

export const useGenerateDelegateToken = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("not_authenticated");
      // Revoke any existing active tokens first (one active token per owner)
      await supabase
        .from("delegate_tokens")
        .update({ is_revoked: true })
        .eq("owner_id", user.id)
        .eq("is_revoked", false);

      const token = `ts_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const { data, error } = await supabase
        .from("delegate_tokens")
        .insert({
          owner_id: user.id,
          token,
          expires_at: expires,
          permissions: ["profile_edit"],
        })
        .select()
        .single();
      if (error) throw error;
      return data as DelegateToken;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delegate-token", user?.id] });
    },
  });
};

export const useRevokeDelegateToken = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delegate_tokens")
        .update({ is_revoked: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delegate-token", user?.id] });
    },
  });
};
