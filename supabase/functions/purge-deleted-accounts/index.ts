// Cron-callable edge function: purges PII for any profile whose
// `deletion_scheduled_at` has passed. Safe to invoke repeatedly.
//
// Schedule via Supabase scheduled functions (e.g. once per hour) or call
// manually from an admin tool. Auth account removal still requires a
// service-role admin step (kept out of scope here so users keep their
// auth row until support confirms).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { requireUserOrServiceRole } from "../_shared/require-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron / admin only. Accept either the service-role key or the CRON_SECRET
  // as Bearer. Regular authenticated users must NOT trigger system-wide PII
  // purges.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!token || (token !== serviceKey && (!cronSecret || token !== cronSecret))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(url, serviceKey);

  const nowIso = new Date().toISOString();

  // Find accounts past their grace window
  const { data: due, error: selectError } = await supabase
    .from("user_account_state")
    .select("user_id")
    .lte("deletion_scheduled_at", nowIso)
    .not("deletion_scheduled_at", "is", null);

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = (due ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) {
    return new Response(JSON.stringify({ purged: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Scrub PII across every role-specific profile table. A user lives in
  // exactly one of these, so unrelated updates are no-ops.
  const scrub = {
    display_name: "Deleted user",
    bio: "",
    headline: "",
    website: "",
    location: "",
    avatar_url: null,
    visibility: "private",
  };
  const tables: Array<{ name: string; key: string; cols: Record<string, unknown> }> = [
    { name: "jobseeker_profiles", key: "user_id", cols: scrub },
    { name: "employer_profiles", key: "id", cols: scrub },
    { name: "agent_profiles", key: "user_id", cols: scrub },
    { name: "mentor_profiles", key: "id", cols: scrub },
    { name: "partner_profiles", key: "user_id", cols: scrub },
    { name: "admin_profiles", key: "user_id", cols: scrub },
  ];
  let updateError: { message: string } | null = null;
  for (const t of tables) {
    const { error } = await (supabase as any).from(t.name).update(t.cols).in(t.key, ids);
    if (error) updateError = { message: `${t.name}: ${error.message}` };
  }

  // Clear the deletion schedule so we don't re-process these rows.
  await supabase
    .from("user_account_state")
    .update({ deletion_scheduled_at: null })
    .in("user_id", ids);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ purged: ids.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
