// Shared auth helper for edge functions that need an authenticated caller.
// Verifies the Bearer token via the anon Supabase client. Returns the user
// or a 401 Response if the token is missing/invalid.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string; email?: string | null } | null;
  errorResponse: Response | null;
}

export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }
  const anon = createClient(supabaseUrl, anonKey);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }
  return { user: { id: data.user.id, email: data.user.email }, errorResponse: null };
}

/**
 * Allow either a valid Supabase user OR the service role / cron secret.
 * Use for jobs that humans and schedulers both call.
 */
export async function requireUserOrServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (token && (token === serviceKey || (cronSecret && token === cronSecret))) {
    return { user: { id: "service-role" }, errorResponse: null };
  }
  return requireUser(req, corsHeaders);
}
