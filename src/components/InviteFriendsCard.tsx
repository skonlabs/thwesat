import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check, Users, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useReferralRewards } from "@/hooks/use-app-config";

/**
 * Reusable Invite Friends widget — renders the user's one-time-use referral
 * codes, progress toward the next reward, and a "Generate more" action.
 * Used on the Profile page and all role dashboards.
 */
const InviteFriendsCard = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { data: referralRewards } = useReferralRewards();
  const refFriends = referralRewards?.friends_required ?? 5;
  const refCredits = referralRewards?.reward_credits ?? 5000;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAllCodes, setShowAllCodes] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: myCodes = [], refetch: refetchCodes } = useQuery({
    queryKey: ["my-referral-codes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("referral_codes")
        .select("code, status, used_by, used_at, created_at")
        .eq("owner_id", profile.id)
        .order("status", { ascending: true })
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const unusedCodes = myCodes.filter((c: any) => c.status === "unused");
  const usedCodesCount = myCodes.length - unusedCodes.length;
  const referralCount = usedCodesCount;
  const progress = referralCount % refFriends;
  const cycle = Math.floor(referralCount / refFriends);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateMoreCodes = async () => {
    if (!profile?.id) return;
    await supabase.rpc("mint_referral_codes", { _owner_id: profile.id, _count: 10 });
    refetchCodes();
  };

  if (!profile?.id) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်းကို ဖိတ်ပါ" : "Invite Friends"}</h3>
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? `သူငယ်ချင်း ${refFriends} ဦး ဖိတ်လျှင် Credits ${refCredits.toLocaleString()} • ${progress}/${refFriends}`
              : `Refer ${refFriends} friends = ${refCredits.toLocaleString()} credits • ${progress}/${refFriends}`}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>

      {expanded && (
      <div className="mt-3">

      {/* Progress bar */}
      <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {lang === "my" ? "နောက်ဆုလာဘ်အထိ" : "Next reward"}
          </span>
          <span className="text-xs font-bold text-primary">{progress}/{refFriends}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(progress / refFriends) * 100}%` }}
          />
        </div>
        {cycle > 0 && (
          <p className="mt-1.5 text-[10px] font-semibold text-primary">
            🎉 {lang === "my"
              ? `ဆုလာဘ် ${cycle} ကြိမ် ရရှိပြီးပါပြီ`
              : `${cycle} reward${cycle > 1 ? "s" : ""} earned so far`}
          </p>
        )}
      </div>

      {/* Codes list */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground">
            {lang === "my"
              ? `သင့်ကုဒ်များ (${unusedCodes.length} မသုံးရသေး၊ ${usedCodesCount} သုံးပြီး)`
              : `Your codes (${unusedCodes.length} unused · ${usedCodesCount} used)`}
          </p>
          {unusedCodes.length === 0 && (
            <button onClick={generateMoreCodes} className="text-[11px] font-semibold text-primary" type="button">
              {lang === "my" ? "ထပ်ထုတ်မည်" : "Generate more"}
            </button>
          )}
        </div>
        {(showAllCodes ? unusedCodes : unusedCodes.slice(0, 3)).map((c: any) => (
          <div key={c.code} className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-mono font-semibold text-foreground">
              {c.code}
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyCode(c.code)}>
              {copiedCode === c.code ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </Button>
          </div>
        ))}
        {unusedCodes.length === 0 && myCodes.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            {lang === "my" ? "ထုတ်ပေးနေသည်..." : "Generating…"}
          </p>
        )}
        {unusedCodes.length === 0 && myCodes.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {lang === "my" ? "ကုဒ်အားလုံး အသုံးပြုပြီးပါပြီ။ ထပ်ထုတ်ပါ။" : "All codes used. Generate more above."}
          </p>
        )}
        {unusedCodes.length > 3 && (
          <button onClick={() => setShowAllCodes(!showAllCodes)} className="text-[11px] font-semibold text-primary" type="button">
            {showAllCodes
              ? (lang === "my" ? "လျှော့ပြ" : "Show less")
              : (lang === "my" ? `ကျန် ${unusedCodes.length - 3} ခု ပြ` : `Show ${unusedCodes.length - 3} more`)}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default InviteFriendsCard;
