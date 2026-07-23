import { useRef, useState, useEffect } from "react"
import * as Sentry from "@sentry/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format, startOfDay, isAfter } from "date-fns"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Separator } from "@travada-books/ui/components/separator"
import { Textarea } from "@travada-books/ui/components/textarea"
import { CurrencySelect } from "@travada-books/ui/components/currency-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog"
import { DatePicker } from "@/components/shared/date-picker"
import { useAuth } from "@/contexts/auth-context"
import { updateOrg, uploadOrgLogo } from "@/lib/queries/org"
import { reconvertTransactionsBaseCurrency, type ReconvertBaseCurrencyResult } from "@/lib/queries/transactions"


export function GeneralSettingsPage() {
  const { org, orgId, refreshOrg } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [currency, setCurrency] = useState("KES")
  const [openingBalance, setOpeningBalance] = useState("")
  const [openingBalanceDate, setOpeningBalanceDate] = useState<Date | undefined>(undefined)
  const [openingBalanceError, setOpeningBalanceError] = useState<string | null>(null)
  const [currencyConfirmOpen, setCurrencyConfirmOpen] = useState(false)
  const lastLoadedOrgIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!org) return
    // Always sync logoUrl so uploads are reflected immediately.
    setLogoUrl(org.logo_url)
    // Only hydrate editable fields on first load or when the org switches,
    // so refreshOrg() calls after logo uploads don't clobber in-progress edits.
    if (org.id === lastLoadedOrgIdRef.current) return
    lastLoadedOrgIdRef.current = org.id
    setName(org.name ?? "")
    setTaxId(org.tax_id ?? "")
    setAddress(org.address_line1 ?? "")
    setEmail(org.email ?? "")
    setPhone(org.phone ?? "")
    setCurrency(org.base_currency ?? "KES")
    setOpeningBalance(org.opening_balance != null ? String(org.opening_balance) : "")
    setOpeningBalanceDate(org.opening_balance_date ? new Date(org.opening_balance_date) : undefined)
    setOpeningBalanceError(null)
  }, [org])

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadOrgLogo(orgId!, file)
      await updateOrg(orgId!, { logo_url: url })
      return url
    },
    onSuccess: async (url) => {
      setLogoUrl(url)
      await refreshOrg()
    },
    onError: (err) => {
      Sentry.captureException(err)
      toast.error("Failed to upload logo. Please try again.")
    },
  })

  const profileMutation = useMutation({
    mutationFn: () =>
      updateOrg(orgId!, {
        name: name.trim() || org!.name,
        tax_id: taxId.trim() || null,
        address_line1: address.trim() || null,
        email: email.trim() || org!.email,
        phone: phone.trim() || null,
      }),
    onSuccess: () => refreshOrg(),
  })

  const currencyMutation = useMutation({
    mutationFn: async (): Promise<ReconvertBaseCurrencyResult | null> => {
      const previousCurrency = org?.base_currency
      await updateOrg(orgId!, { base_currency: currency })
      if (!previousCurrency || previousCurrency === currency) return null
      return reconvertTransactionsBaseCurrency(orgId!, currency)
    },
    onSuccess: async (result) => {
      await refreshOrg()
      if (result) {
        queryClient.invalidateQueries({ queryKey: ["transactions", orgId] })
        queryClient.invalidateQueries({ queryKey: ["transaction-summary", orgId] })
        queryClient.invalidateQueries({ queryKey: ["metric", orgId] })
      }
    },
  })

  function saveCurrency() {
    toast.promise(currencyMutation.mutateAsync(), {
      loading: "Saving…",
      success: (result) => {
        if (!result) return "Base currency updated."
        if (result.skippedCount > 0) {
          return `Base currency updated. ${result.updatedCount} transaction${result.updatedCount === 1 ? "" : "s"} reconverted — ${result.skippedCount} skipped (no exchange rate for ${result.skippedCurrencies.join(", ")}).`
        }
        if (result.updatedCount > 0) {
          return `Base currency updated. ${result.updatedCount} transaction${result.updatedCount === 1 ? "" : "s"} reconverted.`
        }
        return "Base currency updated."
      },
      error: (err) => {
        Sentry.captureException(err)
        return "Failed to update base currency. Please try again."
      },
    })
  }

  // Returns the validated { amount, date } payload, or null (and sets an
  // inline field error) when the pair of fields don't form a valid balance.
  function validateOpeningBalance(): { amount: number | null; date: string | null } | null {
    const trimmed = openingBalance.trim()
    const hasAmount = trimmed !== ""
    const hasDate = openingBalanceDate != null

    if (!hasAmount && !hasDate) {
      setOpeningBalanceError(null)
      return { amount: null, date: null }
    }
    if (!hasAmount || !hasDate) {
      setOpeningBalanceError("Enter both a starting balance and a date — they only make sense together.")
      return null
    }
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) {
      setOpeningBalanceError("Enter a valid number.")
      return null
    }
    if (isAfter(startOfDay(openingBalanceDate!), startOfDay(new Date()))) {
      setOpeningBalanceError("The date can't be in the future.")
      return null
    }

    setOpeningBalanceError(null)
    return { amount: numeric, date: format(openingBalanceDate!, "yyyy-MM-dd") }
  }

  const openingBalanceMutation = useMutation({
    mutationFn: (payload: { amount: number | null; date: string | null }) =>
      updateOrg(orgId!, { opening_balance: payload.amount, opening_balance_date: payload.date }),
    onSuccess: async () => {
      await refreshOrg()
      await queryClient.invalidateQueries({ queryKey: ["metric", orgId, "get_runway"] })
    },
  })

  return (
    <div className='flex flex-col gap-8'>
      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Business Profile</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Appears on your invoices, quotes, and documents.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='business-name'>Business name</Label>
            <Input
              id='business-name'
              placeholder='Acme Ltd'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='kra-pin'>TAX/VAT No.</Label>
            <Input
              id='kra-pin'
              placeholder='A000000000A'
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='address'>Business address</Label>
          <Textarea
            id='address'
            placeholder='P.O. Box 00000, Nairobi, Kenya'
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='email'>
              Business email <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='billing@yourbusiness.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Used as the reply-to on all client emails.
            </p>
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='phone'>Phone number</Label>
            <Input
              id='phone'
              type='tel'
              placeholder='+254 700 000 000'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label>Business logo</Label>
          <div className='flex items-center gap-4'>
            <div className='flex size-16 items-center justify-center rounded-lg border bg-muted overflow-hidden'>
              {logoUrl ?
                <img src={logoUrl} alt='Logo' className='size-full object-contain' />
              : <span className='text-xs text-muted-foreground'>Logo</span>}
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/jpg,image/webp,image/svg+xml'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 2 * 1024 * 1024) {
                  toast.error("Logo must be under 2 MB.")
                  e.target.value = ""
                  return
                }
                if (file.type !== "image/svg+xml") {
                  const url = URL.createObjectURL(file)
                  const img = new Image()
                  img.onload = () => {
                    URL.revokeObjectURL(url)
                    if (img.width > 1024 || img.height > 1024) {
                      toast.error("Logo must be 1024 × 1024 px or smaller.")
                      e.target.value = ""
                      return
                    }
                    logoMutation.mutate(file)
                    e.target.value = ""
                  }
                  img.onerror = () => {
                    URL.revokeObjectURL(url)
                    toast.error("Unable to decode image.")
                    e.target.value = ""
                  }
                  img.src = url
                } else {
                  logoMutation.mutate(file)
                  e.target.value = ""
                }
              }}
            />
            <div className='flex flex-col gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => fileInputRef.current?.click()}
                disabled={logoMutation.isPending}
              >
                {logoMutation.isPending ? "Uploading…" : "Upload logo"}
              </Button>
              <p className='text-xs text-muted-foreground'>PNG, JPG, WebP or SVG · Max 1024 × 1024 px · 2 MB</p>
            </div>
          </div>
        </div>

        <Button
          size='sm'
          className='w-fit'
          onClick={() =>
            toast.promise(profileMutation.mutateAsync(), {
              loading: "Saving…",
              success: "Business profile saved.",
              error: (err) => {
                Sentry.captureException(err);
                return "Failed to save business profile. Please try again.";
              },
            })
          }
          disabled={profileMutation.isPending}
        >
          Save changes
        </Button>
      </section>

      <Separator />

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Base Currency</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Used to display all totals and reports. Invoices can still be sent in any
            currency — amounts are converted to your base currency for tracking.
          </p>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label>Currency</Label>
          <CurrencySelect value={currency} onValueChange={setCurrency} className="w-64" />
        </div>

        <Button
          size='sm'
          className='w-fit'
          onClick={() => {
            if (org?.base_currency && currency !== org.base_currency) {
              setCurrencyConfirmOpen(true)
            } else {
              saveCurrency()
            }
          }}
          disabled={currencyMutation.isPending}
        >
          Save changes
        </Button>

        <AlertDialog open={currencyConfirmOpen} onOpenChange={setCurrencyConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change base currency to {currency}?</AlertDialogTitle>
              <AlertDialogDescription>
                Every existing transaction will be reconverted to {currency} using
                current exchange rates, and your Dashboard and Transaction totals will
                update to match. This can take a moment for orgs with a lot of history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  saveCurrency()
                  setCurrencyConfirmOpen(false)
                }}
              >
                Update currency
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <Separator />

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Opening balance</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            This is the cash you had on hand on a given date. Your dashboard adds up income
            and expenses since then to show your current cash position.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='opening-balance'>Starting balance ({currency})</Label>
            <Input
              id='opening-balance'
              type='text'
              inputMode='decimal'
              placeholder='0.00'
              className={openingBalanceError ? "border-destructive" : undefined}
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label>As of</Label>
            <DatePicker
              value={openingBalanceDate}
              onChange={setOpeningBalanceDate}
              placeholder='Pick a date'
            />
          </div>
        </div>
        {openingBalanceError && (
          <p className='text-[11px] text-destructive -mt-3'>{openingBalanceError}</p>
        )}

        <Button
          size='sm'
          className='w-fit'
          onClick={() => {
            const payload = validateOpeningBalance()
            if (!payload) return
            toast.promise(openingBalanceMutation.mutateAsync(payload), {
              loading: "Saving…",
              success: "Opening balance saved.",
              error: (err) => {
                Sentry.captureException(err);
                return "Failed to save opening balance. Please try again.";
              },
            })
          }}
          disabled={openingBalanceMutation.isPending}
        >
          Save changes
        </Button>
      </section>
    </div>
  )
}
