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

async function fetchClientsJson(agentId: string): Promise<AgentClient[]> {
  const { data, error } = await (supabase as any)
    .from("agent_profiles")
    .select("clients")
    .eq("user_id", agentId)
    .maybeSingle();
  if (error) throw error;
  const arr = Array.isArray(data?.clients) ? (data.clients as AgentClient[]) : [];
  return arr;
}

async function saveClientsJson(agentId: string, clients: AgentClient[]) {
  const { error } = await (supabase as any)
    .from("agent_profiles")
    .update({ clients })
    .eq("user_id", agentId);
  if (error) throw error;
}

export function useAgentClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agent-clients", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const all = await fetchClientsJson(user!.id);
      return [...all].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    },
  });
}

export function useUpsertAgentClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AgentClient> & { name: string }) => {
      if (!user) throw new Error("Not signed in");
      // Validate website URL (block javascript:, data:, etc.).
      let safeWebsite = "";
      const raw = (input.website ?? "").trim();
      if (raw) {
        const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        try {
          const u = new URL(withScheme);
          if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme");
          safeWebsite = u.toString();
        } catch {
          throw new Error("Invalid website URL");
        }
      }
      const now = new Date().toISOString();
      const existing = await fetchClientsJson(user.id);
      let next: AgentClient[];
      let saved: AgentClient;
      if (input.id) {
        next = existing.map((c) =>
          c.id === input.id
            ? {
                ...c,
                name: input.name,
                logo_url: input.logo_url ?? c.logo_url ?? "",
                website: safeWebsite,
                industry: input.industry ?? c.industry ?? "",
                notes: input.notes ?? c.notes ?? "",
                is_active: input.is_active ?? c.is_active ?? true,
                updated_at: now,
              }
            : c,
        );
        saved = next.find((c) => c.id === input.id)!;
      } else {
        saved = {
          id: crypto.randomUUID(),
          agent_id: user.id,
          name: input.name,
          logo_url: input.logo_url ?? "",
          website: safeWebsite,
          industry: input.industry ?? "",
          notes: input.notes ?? "",
          is_active: input.is_active ?? true,
          created_at: now,
          updated_at: now,
        };
        next = [saved, ...existing];
      }
      await saveClientsJson(user.id, next);
      return saved;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-clients"] }),
  });
}

export function useDeleteAgentClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const existing = await fetchClientsJson(user.id);
      await saveClientsJson(user.id, existing.filter((c) => c.id !== id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-clients"] }),
  });
}

export async function uploadAgentClientLogo(userId: string, file: File): Promise<string> {
  const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!ALLOWED.includes((file.type || "").toLowerCase())) {
    throw new Error("Only PNG, JPG, or WEBP images are allowed.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File must be under 2MB.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("agent-client-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("agent-client-logos").getPublicUrl(path);
  return data.publicUrl;
}
