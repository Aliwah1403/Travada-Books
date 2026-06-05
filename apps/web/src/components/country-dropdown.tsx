import { useState, useCallback, useEffect } from "react";
import { CircleFlag } from "react-circle-flags";
import { countries } from "country-data-list";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command";
import { cn } from "@travada-books/ui/lib/utils";
import { ArrowDown01Icon, TickIcon, Globe02Icon } from "@travada-books/ui/icons";

export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

const ALL_COUNTRIES: Country[] = (countries.all as Country[]).filter(
  (c) => c.emoji && c.status !== "deleted" && c.ioc !== "PRK"
);

interface CountryDropdownProps {
  value?: string;
  onChange?: (country: Country) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CountryDropdown({
  value,
  onChange,
  disabled = false,
  placeholder = "Select country",
  className,
}: CountryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Country | undefined>(undefined);

  useEffect(() => {
    if (value) {
      setSelected(ALL_COUNTRIES.find((c) => c.alpha2 === value));
    } else {
      setSelected(undefined);
    }
  }, [value]);

  const handleSelect = useCallback(
    (country: Country) => {
      setSelected(country);
      onChange?.(country);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-xs ring-offset-background transition-colors",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-muted-foreground",
              className
            )}
          >
            {selected ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <CircleFlag
                    countryCode={selected.alpha2.toLowerCase()}
                    height={16}
                  />
                </div>
                <span className="truncate">{selected.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Globe02Icon size={14} className="shrink-0" />
                <span>{placeholder}</span>
              </div>
            )}
            <ArrowDown01Icon size={14} className="shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent
        className="w-[var(--anchor-width)] min-w-56 p-0"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {ALL_COUNTRIES.filter((c) => c.name).map((country) => (
                <CommandItem
                  key={country.alpha2}
                  value={country.name}
                  onSelect={() => handleSelect(country)}
                  className="flex items-center gap-2"
                >
                  <div className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <CircleFlag
                      countryCode={country.alpha2.toLowerCase()}
                      height={16}
                    />
                  </div>
                  <span className="truncate">{country.name}</span>
                  <TickIcon
                    size={13}
                    className={cn(
                      "ml-auto shrink-0",
                      selected?.alpha2 === country.alpha2
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
