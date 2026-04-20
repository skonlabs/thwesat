// One-off admin script: resets test account passwords. DELETE AFTER USE.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_USERS = [
  "112e4a7d-905e-40c4-8916-3a0a8a85f293",
  "b1d3296f-dd3b-4843-a8a7-23da98c5119c",
  "58b8e6b6-23c8-433b-b050-deea888a35af",
  "f2215b3d-f440-481a-8626-c5c1042c3d08",
  "d5f9c948-70c8-4510-a149-75712703e7b6",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const results: Record<string, string> = {};
  for (const id of TEST_USERS) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: "test@123",
      email_confirm: true,
    });
    results[id] = error ? `ERR: ${error.message}` : "ok";
  }
  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
