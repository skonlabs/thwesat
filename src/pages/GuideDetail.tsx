import { useState } from "react";
import { Clock, CheckCircle, ThumbsUp, ThumbsDown, Share2, Languages, Loader2, ChevronDown, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useGuide, useGuideFeedbackCounts, useUserGuideFeedback } from "@/hooks/use-guides-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TRANSLATE_LANGUAGES } from "@/lib/translate-languages";
import { sanitizeHtml } from "@/lib/sanitize";

/** Render markdown-like guide content as formatted React elements */
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
    if (!trimmed) { flushUl(); flushOl(); continue; }

    if (trimmed.startsWith("### ")) {
      flushUl(); flushOl();
      elements.push(<h4 key={key++} className="mb-2 mt-5 text-sm font-bold text-foreground">{renderInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith("## ")) {
      flushUl(); flushOl();
      elements.push(<h3 key={key++} className="mb-2 mt-6 text-base font-bold text-foreground">{renderInline(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith("# ")) {
      flushUl(); flushOl();
      elements.push(<h2 key={key++} className="mb-3 mt-6 text-lg font-bold text-foreground">{renderInline(trimmed.slice(2))}</h2>);
    } else if (/^[-*•]\s/.test(trimmed)) {
      flushOl();
      listBuffer.push(trimmed.replace(/^[-*•]\s+/, ""));
    } else if (/^\d+[.)]\s/.test(trimmed)) {
      flushUl();
      olBuffer.push(trimmed.replace(/^\d+[.)]\s+/, ""));
    } else if (trimmed.startsWith("> ")) {
      flushUl(); flushOl();
      elements.push(
        <blockquote key={key++} className="mb-4 border-l-4 border-primary/30 bg-primary/5 py-2 pl-4 pr-3 text-sm italic text-foreground/70 rounded-r-lg">
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
    } else if (/^---+$/.test(trimmed)) {
      flushUl(); flushOl();
      elements.push(<hr key={key++} className="my-5 border-border" />);
    } else {
      flushUl(); flushOl();
      elements.push(<p key={key++} className="mb-3 text-sm leading-relaxed text-foreground/80">{renderInline(trimmed)}</p>);
    }
  }
  flushUl(); flushOl();
  return elements;
}

/**
 * issue #51: extended inline renderer supporting:
 *   **bold**, *italic*, _italic_, `code`, [text](url) links
 *
 * Splits on each pattern in a single pass to preserve correct ordering.
 * Link URLs are validated to start with http/https for safety.
 * All rendered output goes through React JSX — no dangerouslySetInnerHTML used here.
 */
function renderInline(text: string): React.ReactNode {
  // Combined regex: captures bold, italic (*/_), inline code, and markdown links.
  // Order matters: bold (**) must come before italic (*) so ** isn't treated as two *.
  const tokenRe = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = tokenRe.exec(text)) !== null) {
    const [token] = match;
    // Append any plain text before this token.
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      // Bold
      parts.push(<strong key={i++} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      // Italic
      parts.push(<em key={i++} className="italic">{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      // Inline code
      parts.push(<code key={i++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      // Markdown link: [text](url) — URL is already validated as http/https by the regex.
      const labelMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (labelMatch) {
        const [, label, href] = labelMatch;
        // Sanitize href with the allowlist from sanitizeHtml — since the regex already
        // constrains to http/https, this is a belt-and-suspenders check.
        const safeHref = /^https?:\/\//i.test(href) ? href : "";
        parts.push(
          <a
            key={i++}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {label}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  // Append any remaining plain text.
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
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
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  // Restore the previously selected language for this guide from localStorage.
  const langPrefKey = id ? `guide_lang_${id}` : null;
  const [translatedLang, setTranslatedLang] = useState<string | null>(() => {
    if (!langPrefKey) return null;
    return localStorage.getItem(langPrefKey);
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const feedback = userFeedback ? (userFeedback.is_helpful ? "yes" : "no") : null;

  const handleFeedback = async (type: "yes" | "no") => {
    if (!user || !id) {
      return;
    }
    await supabase.from("guide_feedback").upsert({
      guide_id: id, user_id: user.id, is_helpful: type === "yes",
    }, { onConflict: "guide_id,user_id" });
    queryClient.invalidateQueries({ queryKey: ["guide-feedback-counts", id] });
    queryClient.invalidateQueries({ queryKey: ["guide-feedback-user", id, user.id] });
  };

  const handleShare = async () => {
    const shareData = { title: guide?.title || "Guide", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // user cancelled
    }
  };

  const handleTranslate = async (langCode: string) => {
    setPickerOpen(false);
    if (!guide) return;
    // Persist the chosen language so it's restored on the next visit.
    if (langPrefKey) {
      localStorage.setItem(langPrefKey, langCode);
    }
    // If we already translated to this language, just toggle visibility
    if (translatedContent && translatedLang === langCode) {
      setShowTranslation(true);
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { content: guide.content, sourceLang: "auto", targetLang: langCode },
      });
      if (error) throw error;
      setTranslatedContent(data.translatedContent);
      setTranslatedLang(langCode);
      setShowTranslation(true);
    } catch {
      toast({ title: lang === "my" ? "ဘာသာပြန်၍ မရပါ" : "Translation failed. Please try again.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const activeLangMeta = TRANSLATE_LANGUAGES.find(l => l.code === translatedLang);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} backPath="/guides" />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} backPath="/guides" />
        <div className="flex flex-col items-center py-16 text-center px-5">
          <p className="text-sm text-muted-foreground">{lang === "my" ? "လမ်းညွှန်ချက် မတွေ့ပါ" : "Guide not found"}</p>
        </div>
      </div>
    );
  }

  const displayContent = showTranslation && translatedContent ? translatedContent : guide.content;
  const yesCount = counts?.yes ?? 0;
  const noCount = counts?.no ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်" : "Guide"} backPath="/guides" />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            {guide.category} {guide.country_flag ? `· ${guide.country_flag} ${guide.country}` : ""}
          </span>
          <h1 className="mb-2 text-xl font-bold leading-tight text-foreground">
            {lang === "my" && guide.title_my ? guide.title_my : guide.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-2">
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
            {guide.updated_at && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lang === "my" ? "နောက်ဆုံးပြင်ဆင်:" : "Last updated:"} {new Date(guide.updated_at).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground active:bg-muted"
            >
              <Printer className="h-3 w-3" strokeWidth={1.5} />
              {lang === "my" ? "ပုံနှိပ်ရန်" : "Print"}
            </button>
          </div>

          {/* Translate controls */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              disabled={isTranslating}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
                showTranslation
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground active:bg-muted"
              }`}
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Languages className="h-4 w-4" strokeWidth={1.5} />
              )}
              {isTranslating
                ? (lang === "my" ? "ဘာသာပြန်နေသည်..." : "Translating...")
                : showTranslation && activeLangMeta
                  ? `${activeLangMeta.flag} ${activeLangMeta.label}`
                  : (lang === "my" ? "ဘာသာပြန်ရန်" : "Translate")}
              <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={1.5} />
            </button>
            {showTranslation && (
              <button
                onClick={() => setShowTranslation(false)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted"
              >
                {lang === "my" ? "မူရင်း" : "Original"}
              </button>
            )}
          </div>

          <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <SheetContent side="bottom" className="bottom-16 max-h-[75vh] rounded-t-3xl border-t-0 px-5 pb-6 pt-5">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <SheetHeader className="mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                    <Languages className="h-4 w-4 text-primary" strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <SheetTitle className="text-base font-bold leading-tight">
                      {lang === "my" ? "ဘာသာပြန်ရန်" : "Translate to"}
                    </SheetTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "my" ? "ဘာသာစကား ရွေးချယ်ပါ" : "Choose a language"}
                    </p>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-3 gap-1.5 overflow-y-auto pb-2 sm:grid-cols-4">
                {TRANSLATE_LANGUAGES.map((l) => {
                  const isActive = translatedLang === l.code && showTranslation;
                  const native = l.label.includes("(") ? l.label.split("(")[0].trim() : l.label;
                  return (
                    <button
                      key={l.code}
                      onClick={() => handleTranslate(l.code)}
                      className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all active:scale-[0.97] ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-navy"
                          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {isActive && (
                        <CheckCircle className="absolute right-1 top-1 h-3 w-3 text-accent" strokeWidth={2.5} />
                      )}
                      <span className="text-xl leading-none">{l.flag}</span>
                      <span className={`block w-full truncate text-[11px] font-semibold leading-tight ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                        {native}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>


          {/* Formatted content — sanitizeHtml strips any injected HTML from external
              translated content before the markdown parser processes it. The parser
              itself emits safe React JSX, not dangerouslySetInnerHTML. */}
          <div className="max-w-none">
            {renderGuideContent(sanitizeHtml(displayContent))}
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
