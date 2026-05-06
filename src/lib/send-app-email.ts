import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget helper to send a transactional email.
 * Looks up the recipient's email from `profiles` if only a userId is given.
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
    if (!to && opts.recipientUserId) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", opts.recipientUserId)
        .maybeSingle();
      to = (data as any)?.email || null;
    }
    if (!to) return;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: opts.templateName,
        recipientEmail: to,
        idempotencyKey: opts.idempotencyKey,
        templateData: opts.templateData ?? {},
      },
    });
  } catch (err) {
    console.warn("sendAppEmail failed", opts.templateName, err);
  }
}
