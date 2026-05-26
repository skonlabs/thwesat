// Send password reset email via Resend, using a Supabase-generated recovery link.
// Falls back silently for unknown emails to prevent user enumeration.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const FROM_ADDRESS = Deno.env.get("RESEND_FROM_ADDRESS") || "ThweSat <onboarding@resend.dev>";
const REDIRECT_BASE =
  Deno.env.get("APP_PUBLIC_URL") || "https://thwesat.com";

interface Body {
  email?: string;
  redirectTo?: string;
  lang?: "en" | "my";
}

function renderEmail(link: string, lang: "en" | "my") {
  const my = lang === "my";
  const heading = my ? "စကားဝှက် ပြန်လည်သတ်မှတ်ရန်" : "Reset your password";
  const intro = my
    ? "သင်၏ ThweSat အကောင့်အတွက် စကားဝှက် ပြန်လည်သတ်မှတ်ရန် တောင်းဆိုခဲ့ပါသည်။ အောက်ပါခလုတ်ကို နှိပ်၍ စကားဝှက်အသစ် သတ်မှတ်ပါ။"
    : "We received a request to reset the password for your ThweSat account. Click the button below to set a new password.";
  const cta = my ? "စကားဝှက် ပြောင်းမည်" : "Reset password";
  const fallback = my
    ? "ခလုတ်အလုပ်မလုပ်ပါက ဤလင့်ခ်ကို ဘရောက်ဇာတွင် ထည့်ပါ:"
    : "If the button doesn't work, paste this link into your browser:";
  const ignore = my
    ? "သင် ဤတောင်းဆိုမှု မပြုလုပ်ခဲ့ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုနိုင်ပါသည်။"
    : "If you didn't request this, you can safely ignore this email.";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B1740;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8e4dd;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1B1740;">${heading}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4a4762;">${intro}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#1B1740;color:#FFBE5C;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:14px;">${cta}</a>
      </div>
      <p style="margin:24px 0 8px;font-size:12px;color:#6b6885;">${fallback}</p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#1B1740;"><a href="${link}" style="color:#1B1740;">${link}</a></p>
      <hr style="border:none;border-top:1px solid #e8e4dd;margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:#6b6885;">${ignore}</p>
    </div>
    <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#94909e;">© ${new Date().getFullYear()} ThweSat</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, redirectTo, lang = "en" }: Body = await req.json();
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing required env vars");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const redirect = redirectTo || `${REDIRECT_BASE}/reset-password`;

    // Generate the recovery link via Supabase Admin API
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: redirect },
    });

    // Don't leak whether the user exists
    if (error || !data?.properties?.action_link) {
      console.warn("generateLink result", { error: error?.message });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionLink = data.properties.action_link;
    const html = renderEmail(actionLink, lang === "my" ? "my" : "en");

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        subject: lang === "my" ? "ThweSat စကားဝှက် ပြန်လည်သတ်မှတ်ရန်" : "Reset your ThweSat password",
        html,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("Resend send failed", resp.status, body);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-password-reset error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
