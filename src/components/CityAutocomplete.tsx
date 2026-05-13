import { useMemo, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { APAC_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  /** When true, hides the leading MapPin icon (parent provides it). */
  hideIcon?: boolean;
};

const CityAutocomplete = ({ value, onChange, placeholder, emptyText, className, hideIcon }: Props) => {
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      APAC_CITIES.map((c) => ({
        value: `${c.city}, ${c.country}`,
        keywords: [c.city, c.country, c.city.toLowerCase(), c.country.toLowerCase()],
      })),
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center gap-2 bg-transparent text-left text-sm outline-none focus-visible:ring-0",
            className
          )}
        >
          {!hideIcon && <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={2} />}
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-50 w-[--radix-popover-trigger-width] min-w-[260px] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <Command
          filter={(itemValue, search) => {
            if (!search) return 1;
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={placeholder || "Search city or country"}
            value={value}
            onValueChange={(v) => onChange(v)}
          />
          <CommandList>
            <CommandEmpty>
              {emptyText || "No matching city. Press Enter to use your text."}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(selected) => {
                    onChange(selected);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.value}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CityAutocomplete;
