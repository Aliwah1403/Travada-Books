import { useState } from "react"
import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PlusSignIcon, Delete01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Textarea } from "@travada-books/ui/components/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@travada-books/ui/components/select"
import { Separator } from "@travada-books/ui/components/separator"

type LineItem = {
  id: string
  description: string
  qty: string
  rate: string
  tax: string
}

const currencies = ["KES", "USD", "EUR", "GBP", "ZAR", "UGX", "TZS"]

function InvoicePreview({
  invoiceNumber,
  issueDate,
  dueDate,
  currency,
  items,
  notes,
}: {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency: string
  items: LineItem[]
  notes: string
}) {
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0
    const rate = parseFloat(item.rate) || 0
    return sum + qty * rate
  }, 0)
  const tax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0
    const rate = parseFloat(item.rate) || 0
    const taxRate = parseFloat(item.tax) || 0
    return sum + qty * rate * (taxRate / 100)
  }, 0)
  const total = subtotal + tax

  return (
    <div className="rounded-lg border bg-white p-8 text-sm dark:bg-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            TB
          </div>
          <p className="mt-2 font-semibold text-foreground">Your Business Name</p>
          <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">INVOICE</p>
          <p className="text-xs text-muted-foreground">{invoiceNumber || "INV-0001"}</p>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-medium text-foreground">Bill To</p>
          <p className="mt-1 text-muted-foreground">Customer Name</p>
          <p className="text-muted-foreground">customer@email.com</p>
        </div>
        <div className="text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">{issueDate || "—"}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Due date:</span>
            <span className="font-medium">{dueDate || "—"}</span>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Line items */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-left font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)
            return (
              <tr key={item.id} className="border-b border-dashed">
                <td className="py-2">{item.description || "—"}</td>
                <td className="py-2 text-right">{item.qty || "0"}</td>
                <td className="py-2 text-right">{item.rate || "0.00"}</td>
                <td className="py-2 text-right">
                  {currency} {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex flex-col items-end gap-1 text-xs">
        <div className="flex w-40 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{currency} {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex w-40 justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{currency} {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
        </div>
        <Separator className="my-1 w-40" />
        <div className="flex w-40 justify-between font-semibold text-sm">
          <span>Total</span>
          <span>{currency} {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {notes && (
        <>
          <Separator className="my-5" />
          <div>
            <p className="text-xs font-medium text-foreground">Notes</p>
            <p className="mt-1 text-xs text-muted-foreground">{notes}</p>
          </div>
        </>
      )}

      <Separator className="my-5" />
      <p className="text-center text-[10px] text-muted-foreground">
        Powered by Travada Books
      </p>
    </div>
  )
}

export function CreateInvoicePage() {
  const navigate = useNavigate()
  const [currency, setCurrency] = useState("KES")
  const [invoiceNumber, setInvoiceNumber] = useState("INV-0001")
  const [issueDate, setIssueDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [recurring, setRecurring] = useState("one_time")
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", qty: "1", rate: "", tax: "0" },
  ])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", qty: "1", rate: "", tax: "0" },
    ])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/invoices")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color="currentColor" strokeWidth={1.5} />
        </Button>
        <span className="text-sm font-medium">New Invoice</span>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="flex w-1/2 flex-col gap-5 overflow-y-auto border-r p-6">
          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input placeholder="Your business name" className="text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input placeholder="Customer name" className="text-xs" />
            </div>
          </div>

          {/* Invoice meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-number" className="text-xs">Invoice #</Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue-date" className="text-xs">Issue Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due-date" className="text-xs">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_60px_80px_60px_32px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Tax %</span>
              <span />
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_60px_80px_60px_32px] gap-2">
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="1"
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="0.00"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="0"
                  value={item.tax}
                  onChange={(e) => updateItem(item.id, "tax", e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={12} color="currentColor" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1 w-fit gap-1" onClick={addItem}>
              <HugeiconsIcon icon={PlusSignIcon} size={12} color="currentColor" strokeWidth={1.5} />
              Add line item
            </Button>
          </div>

          <Separator />

          {/* Notes & recurring */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs">Notes / Terms (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Payment terms, bank details, thank you note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Recurring</Label>
            <Select value={recurring} onValueChange={setRecurring}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time" className="text-xs">One time</SelectItem>
                <SelectItem value="recurring" className="text-xs">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              Save as Draft
            </Button>
            <Button size="sm" className="flex-1">
              Send Invoice
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex w-1/2 flex-col overflow-y-auto bg-muted/30 p-6">
          <p className="mb-4 text-xs font-medium text-muted-foreground">Preview</p>
          <InvoicePreview
            invoiceNumber={invoiceNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            currency={currency}
            items={items}
            notes={notes}
          />
        </div>
      </div>
    </div>
  )
}
