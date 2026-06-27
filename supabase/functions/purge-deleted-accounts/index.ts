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

  const { errorResponse } = await requireUserOrServiceRole(req, corsHeaders);
  if (errorResponse) return errorResponse;

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  // Scrub PII via the profiles view (INSTEAD OF UPDATE trigger routes to the
  // correct role-specific table). Auth row + email/phone are cleared separately.
  const { error: updateError } = await (supabase as any)
    .from("profiles")
    .update({
      display_name: "Deleted user",
      bio: "",
      headline: "",
      phone: "",
      website: "",
      location: "",
      avatar_url: null,
      visibility: "private",
      email: null,
    })
    .in("id", ids);

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
