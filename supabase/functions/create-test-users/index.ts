import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const testUsers = [
    { email: "test-jobseeker@thwesone.app", password: "Test1234!", displayName: "Test Jobseeker", role: "jobseeker" },
    { email: "test-employer@thwesone.app", password: "Test1234!", displayName: "Test Employer", role: "employer" },
    { email: "test-mentor@thwesone.app", password: "Test1234!", displayName: "Test Mentor", role: "mentor" },
    { email: "test-admin@thwesone.app", password: "Test1234!", displayName: "Test Admin", role: "jobseeker", systemRole: "admin" },
    { email: "test-moderator@thwesone.app", password: "Test1234!", displayName: "Test Moderator", role: "jobseeker", systemRole: "moderator" },
  ];

  const results = [];

  for (const u of testUsers) {
    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      results.push({ email: u.email, status: "already_exists", id: userId });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { display_name: u.displayName },
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: u.email, status: "created", id: userId });
    }

    // Update profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      display_name: u.displayName,
      email: u.email,
      primary_role: u.role,
    });

    // Create employer profile if employer
    if (u.role === "employer") {
      await supabaseAdmin.from("employer_profiles").upsert({
        id: userId,
        company_name: "Test Company Ltd.",
        industry: "Technology",
        company_size: "11-50",
        contact_name: u.displayName,
        contact_email: u.email,
        verification_status: "verified",
        is_verified: true,
      });
    }

    // Create mentor profile if mentor
    if (u.role === "mentor") {
      await supabaseAdmin.from("mentor_profiles").upsert({
        id: userId,
        title: "Career Coach",
        bio: "Experienced career mentor for Myanmar professionals.",
        expertise: ["Career Guidance", "Resume Review", "Interview Prep"],
        hourly_rate: 25,
        is_available: true,
      });
    }

    // Set system role if needed
    if (u.systemRole) {
      await supabaseAdmin.rpc("set_user_role", {
        _user_id: userId,
        _role: u.systemRole,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
