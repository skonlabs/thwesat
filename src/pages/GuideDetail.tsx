import { useState } from "react";
import { Shield, AlertTriangle, Clock, CheckCircle, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useGuide } from "@/hooks/use-guides-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const GuideDetail = () => {
  const { id } = useParams();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: guide, isLoading } = useGuide(id);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  const handleFeedback = async (type: "yes" | "no") => {
    setFeedback(type);
    if (user && id) {
      await supabase.from("guide_feedback").upsert({
        guide_id: id, user_id: user.id, is_helpful: type === "yes",
      });
    }
    toast({
      title: type === "yes"
        ? (lang === "my" ? "ကျေးဇူးတင်ပါသည်!" : "Thank you!")
        : (lang === "my" ? "တုံ့ပြန်ချက် မှတ်တမ်းတင်ပြီးပါပြီ" : "Feedback recorded"),
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: guide?.title || "Guide", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} />
        <div className="flex flex-col items-center py-16 text-center px-5">
          <p className="text-sm text-muted-foreground">{lang === "my" ? "လမ်းညွှန်ချက် မတွေ့ပါ" : "Guide not found"}</p>
        </div>
      </div>
    );
  }

  const content = lang === "my" && guide.content_my ? guide.content_my : guide.content;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            {guide.category} {guide.country_flag ? `· ${guide.country_flag} ${guide.country}` : ""}
          </span>
          <h1 className="mb-2 text-xl font-bold leading-tight text-foreground">
            {lang === "my" && guide.title_my ? guide.title_my : guide.title}
          </h1>

          <div className="mb-4 flex flex-wrap gap-2">
            {guide.is_verified && (
              <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[10px] font-medium text-emerald">
                <CheckCircle className="h-3 w-3" /> {guide.verified_by ? `${lang === "my" ? "အတည်ပြု" : "Verified by"} ${guide.verified_by}` : (lang === "my" ? "အတည်ပြုပြီး" : "Verified")}
              </span>
            )}
            {guide.read_time_minutes && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {guide.read_time_minutes} {lang === "my" ? "မိနစ်" : "min read"}
              </span>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-foreground/80">
            {content.split("\n").map((p, i) => (
              <p key={i} className="mb-3 text-sm leading-relaxed">{p}</p>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဤလမ်းညွှန်ချက် အကူအညီဖြစ်ပါသလား?" : "Was this guide helpful?"}</p>
            <div className="flex gap-3">
              <button onClick={() => handleFeedback("yes")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "yes" ? "bg-emerald text-emerald-foreground" : "bg-emerald/10 text-emerald active:bg-emerald/20"}`}>
                <ThumbsUp className="h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ဟုတ်ပါတယ်" : "Yes"}
              </button>
              <button onClick={() => handleFeedback("no")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "no" ? "bg-muted-foreground text-card" : "bg-muted text-muted-foreground active:bg-muted/80"}`}>
                <ThumbsDown className="h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "မဟုတ်ပါ" : "No"}
              </button>
              <button onClick={handleShare}
                className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/80">
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuideDetail;
