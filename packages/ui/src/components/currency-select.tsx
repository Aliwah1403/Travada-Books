import React from "react"
import { currencies as AllCurrencies } from "country-data-list"
import { cn } from "@travada-books/ui/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@travada-books/ui/components/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons"

export interface Currency {
  code: string
  decimals: number
  name: string
  number: string
  symbol?: string
  // keywords for searching — country names, aliases, etc.
  keywords?: string
}

// The 25 currencies we support via our exchange rates table.
// `keywords` adds country names and common aliases so searching "Kenya" finds KES.
const SUPPORTED: { code: string; keywords: string }[] = [
  { code: "AED", keywords: "UAE United Arab Emirates dirham" },
  { code: "AUD", keywords: "Australia australian dollar" },
  { code: "BIF", keywords: "Burundi burundian franc" },
  { code: "CAD", keywords: "Canada canadian dollar" },
  { code: "CHF", keywords: "Switzerland Swiss franc" },
  { code: "CNY", keywords: "China Chinese yuan renminbi" },
  { code: "EGP", keywords: "Egypt Egyptian pound" },
  { code: "ETB", keywords: "Ethiopia Ethiopian birr" },
  { code: "EUR", keywords: "Euro Europe eurozone" },
  { code: "GBP", keywords: "UK United Kingdom Britain pound sterling" },
  { code: "GHS", keywords: "Ghana Ghanaian cedi" },
  { code: "INR", keywords: "India Indian rupee" },
  { code: "JPY", keywords: "Japan Japanese yen" },
  { code: "KES", keywords: "Kenya Kenyan shilling" },
  { code: "MAD", keywords: "Morocco Moroccan dirham" },
  { code: "MWK", keywords: "Malawi Malawian kwacha" },
  { code: "NGN", keywords: "Nigeria Nigerian naira" },
  { code: "RWF", keywords: "Rwanda Rwandan franc" },
  { code: "SAR", keywords: "Saudi Arabia riyal" },
  { code: "TZS", keywords: "Tanzania Tanzanian shilling" },
  { code: "UGX", keywords: "Uganda Ugandan shilling" },
  { code: "USD", keywords: "United States US dollar america" },
  { code: "XAF", keywords: "Central Africa CFA franc BEAC Cameroon Chad Gabon" },
  { code: "XOF", keywords: "West Africa CFA franc BCEAO Senegal Mali Ivory Coast" },
  { code: "ZAR", keywords: "South Africa rand" },
]

const KEYWORD_MAP = new Map(SUPPORTED.map((s) => [s.code, s.keywords]))

const buildCurrencyList = (): Currency[] => {
  const map = new Map<string, Currency>()
  ;(AllCurrencies.all as Currency[]).forEach((c) => {
    if (c.code && c.name && KEYWORD_MAP.has(c.code) && !map.has(c.code)) {
      map.set(c.code, {
        code: c.code,
        name: c.code === "EUR" ? "Euro" : c.name,
        symbol: c.symbol,
        decimals: c.decimals,
        number: c.number,
        keywords: KEYWORD_MAP.get(c.code),
      })
    }
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

const CURRENCY_LIST = buildCurrencyList()

interface CurrencySelectProps {
  value?: string
  onValueChange?: (value: string) => void
  onCurrencySelect?: (currency: Currency) => void
  name?: string
  placeholder?: string
  variant?: "default" | "small"
  valid?: boolean
  disabled?: boolean
  className?: string
}

const CurrencySelect = React.forwardRef<HTMLButtonElement, CurrencySelectProps>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      placeholder = "Select currency",
      valid = true,
      disabled,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selected = value ? CURRENCY_LIST.find((c) => c.code === value) : null

    const filtered = React.useMemo(() => {
      if (!search.trim()) return CURRENCY_LIST
      const q = search.toLowerCase()
      return CURRENCY_LIST.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.keywords?.toLowerCase().includes(q)
      )
    }, [search])

    const handleSelect = (code: string) => {
      const currency = CURRENCY_LIST.find((c) => c.code === code)
      if (!currency) return
      onValueChange?.(code)
      onCurrencySelect?.(currency)
      setOpen(false)
      setSearch("")
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              ref={ref}
              type="button"
              data-valid={valid}
              className={cn(
                "flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed whitespace-nowrap transition-colors outline-none",
                "hover:bg-input/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground",
                !valid && "border-destructive ring-2 ring-destructive/20",
                className
              )}
            >
              {selected ? (
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground w-8 shrink-0 text-left">{selected.code}</span>
                  <span>{selected.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          }
        />
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={4}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by code, name or country..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filtered.length === 0 ? (
                <CommandEmpty>No currency found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((currency) => (
                    <CommandItem
                      key={currency.code}
                      value={currency.code}
                      data-checked={value === currency.code}
                      onSelect={() => handleSelect(currency.code)}
                    >
                      <span className="text-muted-foreground w-8 shrink-0 text-left">{currency.code}</span>
                      <span>{currency.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

CurrencySelect.displayName = "CurrencySelect"

export { CurrencySelect, CURRENCY_LIST }
