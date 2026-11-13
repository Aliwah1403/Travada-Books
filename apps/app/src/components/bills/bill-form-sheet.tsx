import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Textarea } from "@travada-books/ui/components/textarea"
import { Separator } from "@travada-books/ui/components/separator"
import { CurrencySelect } from "@travada-books/ui/components/currency-select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@travada-books/ui/components/sheet"
import { Field, FieldLabel, FieldError } from "@travada-books/ui/components/field"
import { DatePicker } from "@/components/shared/date-picker"
import { useAuth } from "@/contexts/auth-context"
import { trackEvent, LogEvents } from "@/lib/analytics"
import { parseDateOnly, toDateOnlyString } from "@/lib/format-date"
import { type Bill, type BillInput } from "@/lib/queries/bills"
import { billWrites } from "@/lib/bill-api"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present = edit mode. */
  bill?: Bill | null
}

type Errors = Partial<Record<"vendor" | "amount" | "dueDate", string>>

export function BillFormSheet({ open, onOpenChange, bill }: Props) {
  const { orgId, user, org } = useAuth()
  const queryClient = useQueryClient()
  const orgCurrency = org?.base_currency ?? "KES"

  const [vendor, setVendor] = useState("")
  const [billNumber, setBillNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(orgCurrency)
  const [issueDate, setIssueDate] = useState<Date | undefined>()
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<Errors>({})

  // Reset the form each time the sheet opens, from the bill when editing.
  useEffect(() => {
    if (!open) return
    setVendor(bill?.vendor_name ?? "")
    setBillNumber(bill?.bill_number ?? "")
    setAmount(bill ? String(bill.amount) : "")
    setCurrency(bill?.currency ?? orgCurrency)
    setIssueDate(bill?.issue_date ? parseDateOnly(bill.issue_date) : undefined)
    setDueDate(bill?.due_date ? parseDateOnly(bill.due_date) : undefined)
    setNote(bill?.note ?? "")
    setErrors({})
  }, [open, bill, orgCurrency])

  const save = useMutation({
    mutationFn: async (input: BillInput) => {
      if (bill) await billWrites.update(bill.id, input)
      else await billWrites.create(orgId!, user?.id ?? null, input)
    },
    onSuccess: (_d, input) => {
      if (bill) {
        trackEvent(LogEvents.BillEdited, { source: bill.source })
      } else {
        trackEvent(LogEvents.BillCreated, {
          source: "manual",
          has_due_date: !!input.due_date,
          currency: input.currency,
        })
      }
      queryClient.invalidateQueries({ queryKey: ["bills", orgId] })
      toast.success(bill ? "Bill updated" : "Bill added")
      onOpenChange(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the bill."),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    const parsedAmount = Number(amount)
    if (!vendor.trim()) next.vendor = "Vendor is required."
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      next.amount = "Enter a valid amount."
    }
    if (issueDate && dueDate && dueDate < issueDate) {
      next.dueDate = "Due date can't be before the issue date."
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    save.mutate({
      vendor_name: vendor.trim(),
      bill_number: billNumber.trim() || null,
      amount: parsedAmount,
      currency,
      issue_date: issueDate ? toDateOnlyString(issueDate) : null,
      due_date: dueDate ? toDateOnlyString(dueDate) : null,
      note: note.trim() || null,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{bill ? "Edit bill" : "Add bill"}</SheetTitle>
          <SheetDescription>
            {bill ? "Update the details of this bill." : "Track a supplier invoice you need to pay."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-4 scrollbar-hide">
            <Field data-invalid={!!errors.vendor}>
              <FieldLabel htmlFor="bill-vendor">
                Vendor <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="bill-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                aria-invalid={!!errors.vendor}
                placeholder="Acme Supplies Ltd"
                className="text-xs"
              />
              {errors.vendor && <FieldError>{errors.vendor}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="bill-number">Bill number</FieldLabel>
              <Input
                id="bill-number"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="INV-0042"
                className="text-xs"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="bill-amount">
                  Amount <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="bill-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={!!errors.amount}
                  placeholder="0.00"
                  className="text-xs"
                />
                {errors.amount && <FieldError>{errors.amount}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <CurrencySelect value={currency} onValueChange={setCurrency} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Issue date</FieldLabel>
                <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Pick a date" />
              </Field>
              <Field data-invalid={!!errors.dueDate}>
                <FieldLabel>Due date</FieldLabel>
                <DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick a date" />
                {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="bill-note">Note</FieldLabel>
              <Textarea
                id="bill-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </Field>
          </div>

          <Separator />
          <SheetFooter className="flex-row gap-2 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending ? "Saving…" : bill ? "Save changes" : "Add bill"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
