import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";

type State = "validating" | "valid" | "invalid" | "already" | "submitting" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const { lang } = useLanguage();
  const my = lang === "my";
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("validating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data?.valid === true) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState("done");
      else if ((data as any)?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch (e: any) {
      setError(e?.message || (my ? "တစ်ခုခု မှားယွင်းနေပါသည်" : "Something went wrong"));
      setState("error");
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-xl font-bold text-primary mb-2">
            Thwe<span className="text-gold">Sone</span>
          </div>
          <CardTitle>{my ? "အီးမေးလ် နှစ်သက်ရာများ" : "Email preferences"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "validating" && (
            <p className="text-muted-foreground">{my ? "သင့်လင့်ခ်ကို စစ်ဆေးနေသည်…" : "Checking your link…"}</p>
          )}
          {state === "valid" && (
            <>
              <p>
                {my
                  ? "ThweSone အီးမေးလ်များ ရပ်ဆိုင်းရန် အောက်တွင် နှိပ်ပါ။ အကောင့်နှင့် လုံခြုံရေး မက်ဆေ့ချ်များကိုမူ ဆက်လက် လက်ခံရရှိမည် ဖြစ်သည်။"
                  : "Click below to unsubscribe from ThweSone emails. You'll still receive critical account and security messages."}
              </p>
              <Button onClick={confirm} className="w-full">
                {my ? "ရပ်ဆိုင်းကြောင်း အတည်ပြုပါ" : "Confirm unsubscribe"}
              </Button>
            </>
          )}
          {state === "submitting" && (
            <p className="text-muted-foreground">{my ? "နှစ်သက်ရာများ ပြင်ဆင်နေသည်…" : "Updating your preferences…"}</p>
          )}
          {state === "done" && (
            <p className="text-foreground">
              {my ? "သင်၏ စာရင်းသွင်းမှု ရပ်ဆိုင်းပြီးဖြစ်ပါသည်။ ပြန်လည် ဆုံစည်းမည်ဟု မျှော်လင့်ပါသည်။" : "You've been unsubscribed. Sorry to see you go."}
            </p>
          )}
          {state === "already" && (
            <p className="text-muted-foreground">
              {my ? "ဤအီးမေးလ်လိပ်စာသည် ရပ်ဆိုင်းပြီး ဖြစ်နေပါသည်။" : "This email address is already unsubscribed."}
            </p>
          )}
          {state === "invalid" && (
            <p className="text-destructive">
              {my ? "ဤလင့်ခ်သည် မမှန်ကန် သို့မဟုတ် သက်တမ်းကုန်ဆုံးပြီးပါသည်။" : "This unsubscribe link is invalid or has expired."}
            </p>
          )}
          {state === "error" && (
            <p className="text-destructive">{error || (my ? "တစ်ခုခု မှားယွင်းနေသည်။ ထပ်စမ်းကြည့်ပါ။" : "Something went wrong. Please try again.")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
