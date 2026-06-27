import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget helper to send a transactional email.
 * Looks up the recipient's email + language preference from `profiles` / `user_settings`.
 * Failures are logged but never thrown — emails are non-critical.
 */
export async function sendAppEmail(opts: {
  templateName: string;
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  idempotencyKey: string;
  templateData?: Record<string, any>;
}) {
  try {
    let to = opts.recipientEmail || null;
    let lang: "en" | "my" = "en";

    if (opts.recipientUserId) {
      // Fetch email (if needed) and language in parallel
      const [profileRes, settingsRes] = await Promise.all([
        !to
          ? (supabase as any).from("profiles").select("email").eq("id", opts.recipientUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("user_settings").select("language").eq("user_id", opts.recipientUserId).maybeSingle(),
      ]);
      if (!to) to = (profileRes.data as any)?.email || null;
      const settingLang = (settingsRes.data as any)?.language;
      if (settingLang === "my" || settingLang === "en") lang = settingLang;
    }

    if (!to) return;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: opts.templateName,
        recipientEmail: to,
        idempotencyKey: opts.idempotencyKey,
        templateData: { lang, ...(opts.templateData ?? {}) },
      },
    });
  } catch (err) {
    console.warn("sendAppEmail failed", opts.templateName, err);
  }
}
