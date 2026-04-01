import { Shield, AlertTriangle, Clock, CheckCircle, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useGuide, useGuideFeedbackCounts, useUserGuideFeedback } from "@/hooks/use-guides-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";

/** Render markdown-like guide content as formatted HTML-safe React elements */
function renderGuideContent(raw: string) {
  const lines = raw.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let olBuffer: string[] = [];
  let key = 0;

  const flushUl = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80">
        {listBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ul>
    );
    listBuffer = [];
  };

  const flushOl = () => {
    if (olBuffer.length === 0) return;
    elements.push(
      <ol key={key++} className="mb-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80">
        {olBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ol>
    );
    olBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushUl();
      flushOl();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushUl(); flushOl();
      elements.push(<h4 key={key++} className="mb-2 mt-5 text-sm font-bold text-foreground">{renderInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith("## ")) {
      flushUl(); flushOl();
      elements.push(<h3 key={key++} className="mb-2 mt-6 text-base font-bold text-foreground">{renderInline(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith("# ")) {
      flushUl(); flushOl();
      elements.push(<h2 key={key++} className="mb-3 mt-6 text-lg font-bold text-foreground">{renderInline(trimmed.slice(2))}</h2>);
    }
    // Unordered list
    else if (/^[-*•]\s/.test(trimmed)) {
      flushOl();
      listBuffer.push(trimmed.replace(/^[-*•]\s+/, ""));
    }
    // Ordered list
    else if (/^\d+[.)]\s/.test(trimmed)) {
      flushUl();
      olBuffer.push(trimmed.replace(/^\d+[.)]\s+/, ""));
    }
    // Blockquote / callout
    else if (trimmed.startsWith("> ")) {
      flushUl(); flushOl();
      elements.push(
        <blockquote key={key++} className="mb-4 border-l-4 border-primary/30 bg-primary/5 py-2 pl-4 pr-3 text-sm italic text-foreground/70 rounded-r-lg">
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
    }
    // Horizontal rule
    else if (/^---+$/.test(trimmed)) {
      flushUl(); flushOl();
      elements.push(<hr key={key++} className="my-5 border-border" />);
    }
    // Normal paragraph
    else {
      flushUl(); flushOl();
      elements.push(<p key={key++} className="mb-3 text-sm leading-relaxed text-foreground/80">{renderInline(trimmed)}</p>);
    }
  }
  flushUl();
  flushOl();
  return elements;
}

/** Bold and inline code formatting */
function renderInline(text: string): React.ReactNode {
  // Split on **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const GuideDetail = () => {
  const { id } = useParams();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: guide, isLoading } = useGuide(id);
  const { data: counts } = useGuideFeedbackCounts(id);
  const { data: userFeedback } = useUserGuideFeedback(id, user?.id);

  const feedback = userFeedback ? (userFeedback.is_helpful ? "yes" : "no") : null;

  const handleFeedback = async (type: "yes" | "no") => {
    if (!user || !id) {
      toast({ title: lang === "my" ? "ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ" : "Please sign in first" });
      return;
    }
    await supabase.from("guide_feedback").upsert({
      guide_id: id, user_id: user.id, is_helpful: type === "yes",
    }, { onConflict: "guide_id,user_id" });
    queryClient.invalidateQueries({ queryKey: ["guide-feedback-counts", id] });
    queryClient.invalidateQueries({ queryKey: ["guide-feedback-user", id, user.id] });
    toast({
      title: type === "yes"
        ? (lang === "my" ? "ကျေးဇူးတင်ပါသည်!" : "Thank you!")
        : (lang === "my" ? "တုံ့ပြန်ချက် မှတ်တမ်းတင်ပြီးပါပြီ" : "Feedback recorded"),
    });
  };

  const handleShare = async () => {
    const shareData = { title: guide?.title || "Guide", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
      }
    } catch {
      // user cancelled share dialog
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
  const yesCount = counts?.yes ?? 0;
  const noCount = counts?.no ?? 0;

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

          {/* Formatted content */}
          <div className="max-w-none">
            {renderGuideContent(content)}
          </div>

          {/* Feedback section */}
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "ဤလမ်းညွှန်ချက် အကူအညီဖြစ်ပါသလား?" : "Was this guide helpful?"}</p>
            <div className="flex gap-3">
              <button onClick={() => handleFeedback("yes")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "yes" ? "bg-emerald text-emerald-foreground" : "bg-emerald/10 text-emerald active:bg-emerald/20"}`}>
                <ThumbsUp className="h-4 w-4" strokeWidth={1.5} />
                {lang === "my" ? "ဟုတ်ပါတယ်" : "Yes"}
                <span className="ml-0.5 rounded-full bg-background/30 px-1.5 py-0.5 text-[10px] font-bold">{yesCount}</span>
              </button>
              <button onClick={() => handleFeedback("no")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors ${feedback === "no" ? "bg-muted-foreground text-card" : "bg-muted text-muted-foreground active:bg-muted/80"}`}>
                <ThumbsDown className="h-4 w-4" strokeWidth={1.5} />
                {lang === "my" ? "မဟုတ်ပါ" : "No"}
                <span className="ml-0.5 rounded-full bg-background/30 px-1.5 py-0.5 text-[10px] font-bold">{noCount}</span>
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
