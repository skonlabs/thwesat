import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface AgentClient {
  id: string;
  agent_id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAgentClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agent-clients", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_clients" as any)
        .select("*")
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AgentClient[];
    },
  });
}

export function useUpsertAgentClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AgentClient> & { name: string }) => {
      if (!user) throw new Error("Not signed in");
      const payload: any = {
        agent_id: user.id,
        name: input.name,
        logo_url: input.logo_url ?? "",
        website: input.website ?? "",
        industry: input.industry ?? "",
        notes: input.notes ?? "",
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("agent_clients" as any)
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as AgentClient;
      }
      const { data, error } = await supabase
        .from("agent_clients" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AgentClient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-clients"] }),
  });
}

export function useDeleteAgentClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_clients" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-clients"] }),
  });
}

export async function uploadAgentClientLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("agent-client-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("agent-client-logos").getPublicUrl(path);
  return data.publicUrl;
}
