import { useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { APAC_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  hideIcon?: boolean;
};

const CityAutocomplete = ({ value, onChange, placeholder, emptyText, className, hideIcon }: Props) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => APAC_CITIES.map((c) => `${c.city}, ${c.country}`),
    []
  );

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return all.slice(0, 50);
    return all
      .filter((label) => label.toLowerCase().includes(q))
      .slice(0, 50);
  }, [value, all]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("flex h-10 w-full items-center gap-2", className)}>
          {!hideIcon && <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={2} />}
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && open && matches.length > 0) {
                // Allow form submit if the user typed an exact match-ish; otherwise pick first match.
                const exact = matches.find((m) => m.toLowerCase() === value.trim().toLowerCase());
                if (!exact) {
                  e.preventDefault();
                  onChange(matches[0]);
                  setOpen(false);
                }
              }
            }}
            placeholder={placeholder}
            className="h-10 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="z-50 w-[--radix-popover-trigger-width] min-w-[260px] max-h-72 overflow-y-auto p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Node && inputRef.current?.contains(e.target)) e.preventDefault();
        }}
      >
        {matches.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyText || "No matching city"}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {matches.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers
                    e.preventDefault();
                    onChange(label);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent/15"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CityAutocomplete;
