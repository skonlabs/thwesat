import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  JOB_CATEGORY_PRESETS,
  getCategoryLabel,
  searchCategoryPresets,
} from "@/lib/job-categories";
import { useLanguage } from "@/hooks/use-language";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
}

export default function CategoryCombobox({ values, onChange, max = 5 }: Props) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const ranked = useMemo(() => searchCategoryPresets(query), [query]);
  const trimmed = query.trim();
  const trimmedLower = trimmed.toLowerCase();
  const exactMatch = ranked.some(
    (c) =>
      c.value.toLowerCase() === trimmedLower ||
      c.label.en.toLowerCase() === trimmedLower ||
      c.label.my === trimmed,
  );
  const showCustomOption = trimmed.length > 0 && !exactMatch && !values.includes(trimmed);
  const bestSuggestion = trimmed.length > 0 && ranked.length > 0 ? ranked[0] : null;

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
      return;
    }
    if (values.length >= max) return;
    onChange([...values, value]);
    setQuery("");
  };

  const removeOutside = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== value));
  };

  const reachedMax = values.length >= max;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors ${
          values.length > 0 ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {values.length === 0 && (
            <span className="px-1 text-muted-foreground">
              {lang === "my" ? "အမျိုးအစား ရွေးပါ" : "Select or type categories"}
            </span>
          )}
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
            >
              {getCategoryLabel(v, lang)}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${v}`}
                onClick={(e) => removeOutside(v, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(values.filter((x) => x !== v));
                  }
                }}
                className="-mr-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bottom-16 mx-auto max-w-md rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">
              {lang === "my" ? "အလုပ် အမျိုးအစားများ" : "Job Categories"}
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                {values.length}/{max}
              </span>
            </SheetTitle>
          </SheetHeader>

          {values.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/30 px-4 py-2">
              {values.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
                >
                  {getCategoryLabel(v, lang)}
                  <button
                    type="button"
                    onClick={() => onChange(values.filter((x) => x !== v))}
                    className="-mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary-foreground/20"
                    aria-label={`Remove ${v}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  reachedMax
                    ? lang === "my"
                      ? `အများဆုံး ${max} ခု ရွေးပြီးပြီ`
                      : `Maximum ${max} reached`
                    : lang === "my"
                    ? "ရှာရန် သို့မဟုတ် အသစ်ထည့်ရန်..."
                    : "Search or add custom..."
                }
                disabled={reachedMax}
                className="h-10 rounded-xl pl-9 pr-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (bestSuggestion && !values.includes(bestSuggestion.value)) {
                      toggle(bestSuggestion.value);
                    } else if (showCustomOption) {
                      toggle(trimmed);
                    }
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {bestSuggestion && trimmed.length > 0 && !values.includes(bestSuggestion.value) && (
              <button
                type="button"
                onClick={() => toggle(bestSuggestion.value)}
                disabled={reachedMax}
                className="mt-2 flex w-full items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 text-foreground">
                  <span className="text-muted-foreground">
                    {lang === "my" ? "အကြံပြု" : "Best match"}:
                  </span>{" "}
                  <span className="font-semibold">
                    {lang === "my" ? bestSuggestion.label.my : bestSuggestion.label.en}
                  </span>
                </span>
                <Plus className="h-3.5 w-3.5 text-primary" />
              </button>
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => toggle(trimmed)}
                disabled={reachedMax}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-2.5 text-left text-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 text-accent" />
                <span className="flex-1 text-foreground">
                  {lang === "my" ? "အသစ်ထည့်ရန်" : "Use custom"}:{" "}
                  <span className="font-semibold">{trimmed}</span>
                </span>
              </button>
            )}
            {ranked.length === 0 && !showCustomOption && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {lang === "my" ? "မတွေ့ပါ" : "No matches"}
              </p>
            )}
            <ul className="mt-1 space-y-0.5">
              {ranked.map((c, idx) => {
                const selected = values.includes(c.value);
                const isTopSuggestion =
                  idx === 0 && trimmed.length > 0 && bestSuggestion?.value === c.value && !selected;
                return (
                  <li key={c.value}>
                    <button
                      type="button"
                      onClick={() => toggle(c.value)}
                      disabled={!selected && reachedMax}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-colors disabled:opacity-50 ${
                        selected
                          ? "bg-primary/10 text-foreground"
                          : isTopSuggestion
                          ? "bg-primary/5 text-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="flex flex-1 items-center gap-1.5">
                        {lang === "my" ? c.label.my : c.label.en}
                        {isTopSuggestion && (
                          <Sparkles className="h-3 w-3 text-primary" />
                        )}
                      </span>
                      {selected ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {values.some((v) => !JOB_CATEGORY_PRESETS.some((c) => c.value === v)) && (
              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                {lang === "my" ? "စိတ်ကြိုက် ထည့်ထားသည်" : "Custom added"}:{" "}
                <span className="font-semibold text-foreground">
                  {values
                    .filter((v) => !JOB_CATEGORY_PRESETS.some((c) => c.value === v))
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
