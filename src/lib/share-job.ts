import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PUBLIC_BASE_URL = "https://thwesat.com";

export async function shareJobLink(opts: {
  jobId: string;
  title: string;
  company?: string | null;
  lang: "my" | "en";
}) {
  const { jobId, title, company, lang } = opts;
  const longUrl = `${PUBLIC_BASE_URL}/jobs/${jobId}`;

  let shareUrl = longUrl;
  try {
    const { data, error } = await supabase.functions.invoke("shorten-url", {
      body: { long_url: longUrl },
    });
    if (!error && data?.short_url) shareUrl = data.short_url as string;
  } catch {
    // fall back to long URL
  }

  const text = company ? `${title} — ${company}` : title;
  const shareData: ShareData = { title: text, text, url: shareUrl };

  // Try native share first (mobile)
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share(shareData);
      return shareUrl;
    } catch {
      // user cancelled or unsupported — fall through to clipboard
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success(lang === "my" ? "လင့်ခ် ကူးယူပြီးပါပြီ" : "Link copied to clipboard");
  } catch {
    toast.error(lang === "my" ? "လင့်ခ် ကူးယူ၍ မရပါ" : "Failed to copy link");
  }
  return shareUrl;
}
