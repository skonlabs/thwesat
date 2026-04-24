import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface UserSettings {
  user_id: string;
  language: string;
  font_encoding: string;
  profile_visibility: string;
  session_expiry: string;
  push_notifications: boolean;
  remember_device: boolean;
  telegram_linked: boolean;
  telegram_username: string | null;
  telegram_chat_id: string | null;
}

export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      // Auto-create row if trigger missed it.
      // UPSERT prevents a duplicate-key error from concurrent requests (race condition
      // that could occur when multiple tabs or StrictMode double-mounts fire simultaneously).
      if (!data) {
        const { data: created } = await supabase
          .from("user_settings")
          .upsert({ user_id: user.id }, { onConflict: "user_id" })
          .select("*")
          .single();
        return created as UserSettings;
      }
      return data as UserSettings;
    },
    enabled: !!user,
  });
}

export function useUpdateUserSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user) throw new Error("not_authenticated");
      const { error } = await supabase
        .from("user_settings")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-settings", user?.id] });
    },
  });
}
