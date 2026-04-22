import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Languages, Loader2, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  label: string;
  required?: boolean;
  multiline?: boolean;
  minHeight?: number;
  enValue: string;
  myValue: string;
  onEnChange: (v: string) => void;
  onMyChange: (v: string) => void;
  lang: "my" | "en";
}

export default function BilingualField({
  label,
  required,
  multiline,
  minHeight = 80,
  enValue,
  myValue,
  onEnChange,
  onMyChange,
  lang,
}: Props) {
  const [activeTab, setActiveTab] = useState<"en" | "my">("en");
  const [translating, setTranslating] = useState(false);

  const translate = async (from: "en" | "my") => {
    const source = from === "en" ? enValue : myValue;
    if (!source.trim()) {
      toast.error(lang === "my" ? "မူရင်းစာသား မရှိပါ" : "Source text is empty");
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { content: source, sourceLang: from, targetLang: from === "en" ? "my" : "en" },
      });
      if (error) throw error;
      const translated = (data as any)?.translatedContent || "";
      if (from === "en") {
        onMyChange(translated);
        setActiveTab("my");
      } else {
        onEnChange(translated);
        setActiveTab("en");
      }
    } catch (e: any) {
      toast.error((lang === "my" ? "ဘာသာပြန်၍ မရပါ: " : "Translation failed: ") + (e?.message || ""));
    } finally {
      setTranslating(false);
    }
  };

  const value = activeTab === "en" ? enValue : myValue;
  const onChange = activeTab === "en" ? onEnChange : onMyChange;
  const showTranslateBtn = activeTab === "en" ? enValue.trim().length > 0 : myValue.trim().length > 0;
  const targetLabel = activeTab === "en"
    ? (lang === "my" ? "မြန်မာ" : "Burmese")
    : (lang === "my" ? "အင်္ဂလိပ်" : "English");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">
          {label}{required ? " *" : ""}
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("en")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${activeTab === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            EN {enValue.trim() && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-emerald" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${activeTab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            MY {myValue.trim() && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-emerald" />}
          </button>
        </div>
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
          style={{ minHeight }}
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl" />
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          {activeTab === "en"
            ? (lang === "my" ? "မြန်မာဘာသာ ထည့်ရန် မလိုပါ — အလိုအလျောက် ဘာသာပြန်နိုင်သည်" : "Burmese is optional — translate from English in one click")
            : (lang === "my" ? "အင်္ဂလိပ်ဘာသာ ထည့်ရန် မလိုပါ" : "English is optional if Burmese is filled")}
        </p>
        {showTranslateBtn && (
          <button
            type="button"
            onClick={() => translate(activeTab)}
            disabled={translating}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
            {lang === "my" ? `${targetLabel}သို့` : `Translate → ${targetLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}
