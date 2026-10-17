import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@travada-books/ui/components/button"
import { Checkbox } from "@travada-books/ui/components/checkbox"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command"
import { Popover, PopoverContent, PopoverTrigger } from "@travada-books/ui/components/popover"
import { ToggleGroup, ToggleGroupItem } from "@travada-books/ui/components/toggle-group"
import { cn } from "@travada-books/ui/lib/utils"
import { ArrowDown01Icon, BankIcon, SmartPhone01Icon } from "@travada-books/ui/icons"
import { listPayoutProviders, type PayoutAccountInput, type PayoutType } from "@/lib/queries/payment-accounts"

// Accepts 0712 345 678, 0112…, +254 712…, 254712…, 712345678 → local 07…/01… form.
function normaliseKenyanPhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, "")
  if (digits.startsWith("+254")) digits = "0" + digits.slice(4)
  else if (digits.startsWith("254")) digits = "0" + digits.slice(3)
  else if (/^[17]\d{8}$/.test(digits)) digits = "0" + digits
  return /^0[17]\d{8}$/.test(digits) ? digits : null
}

function BankCombobox({
  banks,
  value,
  onChange,
  invalid,
  loading,
}: {
  banks: { code: string; name: string }[]
  value: string
  onChange: (code: string) => void
  invalid: boolean
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = banks.find((b) => b.code === value)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks
  }, [banks, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={loading}
        render={
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed whitespace-nowrap transition-colors outline-none",
              "fine-hover:bg-input/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              invalid && "border-destructive",
            )}
          >
            {selected ?
              <span className="truncate">{selected.name}</span>
            : <span className="text-muted-foreground">{loading ? "Loading banks…" : "Select your bank"}</span>}
            <ArrowDown01Icon size={14} className="shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search banks…" value={search} onValueChange={setSearch} />
          <CommandList>
            {filtered.length === 0 ?
              <CommandEmpty>No bank found.</CommandEmpty>
            : <CommandGroup>
                {filtered.map((bank) => (
                  <CommandItem
                    key={bank.code}
                    value={bank.code}
                    data-checked={value === bank.code}
                    onSelect={() => {
                      onChange(bank.code)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    {bank.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            }
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type FieldErrors = { phone?: string; bank?: string; account?: string; confirm?: string }

// Shared by the connect page and the "Change payout account" dialog.
export function PayoutAccountForm({
  orgName,
  submitLabel,
  isPending,
  serverError,
  onSubmit,
  secondaryAction,
  children,
}: {
  orgName: string
  submitLabel: string
  isPending: boolean
  serverError?: string | null
  onSubmit: (input: PayoutAccountInput) => void
  secondaryAction?: ReactNode
  // Extra content (e.g. the change-account warning) rendered above the confirm checkbox.
  children?: ReactNode
}) {
  const [payoutType, setPayoutType] = useState<PayoutType>("mobile_money")
  const [phone, setPhone] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["payout-providers"],
    queryFn: listPayoutProviders,
    staleTime: 1000 * 60 * 60,
    enabled: payoutType === "bank",
  })

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: FieldErrors = {}
    let input: PayoutAccountInput | null = null

    if (payoutType === "mobile_money") {
      const normalised = normaliseKenyanPhone(phone)
      if (!normalised) next.phone = "Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678."
      else input = { payoutType, bankCode: "MPESA", accountNumber: normalised }
    } else {
      const digits = accountNumber.replace(/\s/g, "")
      if (!bankCode) next.bank = "Select your bank."
      if (!/^\d{5,20}$/.test(digits)) next.account = "Enter an account number of 5 to 20 digits."
      if (!next.bank && !next.account) input = { payoutType, bankCode, accountNumber: digits }
    }
    if (!confirmed) next.confirm = "Please confirm this account is yours."

    setErrors(next)
    if (input && !next.confirm) onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Where should we send your money?</Label>
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[payoutType]}
          onValueChange={(value) => {
            const next = value[0] as PayoutType | undefined
            if (next) {
              setPayoutType(next)
              setErrors({})
            }
          }}
          className="w-full"
        >
          <ToggleGroupItem value="mobile_money" className="h-9 flex-1 gap-1.5">
            <SmartPhone01Icon size={14} />
            M-Pesa
          </ToggleGroupItem>
          <ToggleGroupItem value="bank" className="h-9 flex-1 gap-1.5">
            <BankIcon size={14} />
            Bank account
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {payoutType === "mobile_money" ?
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payout-phone" className="text-xs">
            M-Pesa number
          </Label>
          <Input
            id="payout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              clearError("phone")
            }}
            placeholder="0712 345 678"
            className={errors.phone ? "border-destructive text-xs" : "text-xs"}
          />
          {errors.phone ?
            <p className="text-[11px] text-destructive">{errors.phone}</p>
          : <p className="text-[11px] text-muted-foreground">
              The M-Pesa number that should receive payouts.
            </p>
          }
        </div>
      : <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Bank</Label>
            <BankCombobox
              banks={providers?.banks ?? []}
              value={bankCode}
              onChange={(code) => {
                setBankCode(code)
                clearError("bank")
              }}
              invalid={!!errors.bank}
              loading={providersLoading}
            />
            {errors.bank && <p className="text-[11px] text-destructive">{errors.bank}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payout-account" className="text-xs">
              Account number
            </Label>
            <Input
              id="payout-account"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value)
                clearError("account")
              }}
              className={errors.account ? "border-destructive text-xs" : "text-xs"}
            />
            {errors.account && <p className="text-[11px] text-destructive">{errors.account}</p>}
          </div>
        </>
      }

      <p className="text-xs text-muted-foreground">
        Payouts are registered to <span className="font-medium text-foreground">{orgName}</span>
      </p>

      {children}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <Checkbox
            id="payout-confirm"
            checked={confirmed}
            onCheckedChange={(checked) => {
              setConfirmed(checked === true)
              clearError("confirm")
            }}
            aria-invalid={!!errors.confirm}
            className="mt-0.5"
          />
          <Label htmlFor="payout-confirm" className="text-xs font-normal leading-snug cursor-pointer">
            I confirm this account belongs to {orgName} or to me.
          </Label>
        </div>
        {errors.confirm && <p className="text-[11px] text-destructive">{errors.confirm}</p>}
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Working…" : submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  )
}
