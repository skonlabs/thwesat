import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { JOB_CATEGORY_PRESETS, getCategoryLabel } from "@/lib/job-categories";
import { useLanguage } from "@/hooks/use-language";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CategoryCombobox({ value, onChange }: Props) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JOB_CATEGORY_PRESETS;
    return JOB_CATEGORY_PRESETS.filter(
      (c) =>
        c.value.toLowerCase().includes(q) ||
        c.label.en.toLowerCase().includes(q) ||
        c.label.my.includes(query.trim())
    );
  }, [query]);

  const trimmed = query.trim();
  const exactMatch = filtered.some(
    (c) =>
      c.value.toLowerCase() === trimmed.toLowerCase() ||
      c.label.en.toLowerCase() === trimmed.toLowerCase()
  );
  const showCustomOption = trimmed.length > 0 && !exactMatch;

  const select = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  const display = value ? getCategoryLabel(value, lang) : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-xs transition-colors ${
          value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
        }`}
      >
        <span className="truncate">
          {display || (lang === "my" ? "အမျိုးအစား ရွေးပါ" : "Select or type a category")}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bottom-16 mx-auto max-w-md rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">
              {lang === "my" ? "အလုပ် အမျိုးအစား" : "Job Category"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === "my" ? "ရှာရန် သို့မဟုတ် အသစ်ထည့်ရန်..." : "Search or add custom..."}
                className="h-10 rounded-xl pl-9 pr-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && showCustomOption) {
                    e.preventDefault();
                    select(trimmed);
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
          </div>
          <div className="max-h-[55vh] overflow-y-auto px-2 py-2">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => select(trimmed)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent/5 px-3 py-2.5 text-left text-xs"
              >
                <Plus className="h-3.5 w-3.5 text-accent" />
                <span className="flex-1 text-foreground">
                  {lang === "my" ? "အသစ်ထည့်ရန်" : "Use custom"}: <span className="font-semibold">{trimmed}</span>
                </span>
              </button>
            )}
            {filtered.length === 0 && !showCustomOption && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {lang === "my" ? "မတွေ့ပါ" : "No matches"}
              </p>
            )}
            <ul className="mt-1 space-y-0.5">
              {filtered.map((c) => {
                const selected = value === c.value;
                return (
                  <li key={c.value}>
                    <button
                      type="button"
                      onClick={() => select(c.value)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                        selected ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="flex-1">{lang === "my" ? c.label.my : c.label.en}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {value && !JOB_CATEGORY_PRESETS.some((c) => c.value === value) && (
              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                {lang === "my" ? "လက်ရှိ စိတ်ကြိုက်" : "Current custom"}:{" "}
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
