import { useNavigate, useParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Download01Icon,
  Copy01Icon,
  PencilEdit01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"

const mockInvoice = {
  id: "2",
  number: "INV-0002",
  status: "paid" as const,
  customer: "Callfast Services LTD",
  customerEmail: "billing@callfast.co.ke",
  amount: 25890,
  currency: "KES",
  dueDate: "09/12/2024",
  issueDate: "20/11/2024",
  recurring: "one_time",
  notes: "Thank you for your business.",
  items: [
    { description: "Web Development Services", qty: 1, rate: 20000, tax: 16 },
    { description: "Hosting & Maintenance (1 year)", qty: 1, rate: 5890, tax: 0 },
  ],
}

export function InvoiceDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const subtotal = mockInvoice.items.reduce((sum, item) => sum + item.qty * item.rate, 0)
  const tax = mockInvoice.items.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.tax / 100),
    0
  )
  const total = subtotal + tax

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/invoices")}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color="currentColor" strokeWidth={1.5} />
          </Button>
          <span className="font-mono text-sm font-medium">{mockInvoice.number}</span>
          <InvoiceStatusBadge status={mockInvoice.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <HugeiconsIcon icon={Download01Icon} size={13} color="currentColor" strokeWidth={1.5} />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <HugeiconsIcon icon={Copy01Icon} size={13} color="currentColor" strokeWidth={1.5} />
            Copy link
          </Button>
          <Button variant="outline" size="sm">
            Mark as paid
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => navigate(`/invoices/create`)}>
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} color="currentColor" strokeWidth={1.5} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <HugeiconsIcon icon={MoreHorizontalIcon} size={13} color="currentColor" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Send reminder</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoice preview */}
      <div className="flex justify-center bg-muted/30 p-8">
        <div className="w-full max-w-2xl rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                TB
              </div>
              <p className="mt-2 font-semibold text-foreground">Your Business Name</p>
              <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
              <p className="text-xs text-muted-foreground">info@yourbusiness.com</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">INVOICE</p>
              <p className="text-xs text-muted-foreground">{mockInvoice.number}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bill To</p>
              <p className="mt-1.5 font-medium text-foreground">{mockInvoice.customer}</p>
              <p className="text-xs text-muted-foreground">{mockInvoice.customerEmail}</p>
            </div>
            <div className="text-right">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Issue date:</span>
                <span className="font-medium">{mockInvoice.issueDate}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Due date:</span>
                <span className="font-medium">{mockInvoice.dueDate}</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Line items */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 text-left font-medium">Description</th>
                <th className="pb-3 text-right font-medium">Qty</th>
                <th className="pb-3 text-right font-medium">Rate</th>
                <th className="pb-3 text-right font-medium">Tax</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoice.items.map((item, i) => (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right">{item.qty}</td>
                  <td className="py-3 text-right">
                    {mockInvoice.currency} {item.rate.toLocaleString("en-KE")}
                  </td>
                  <td className="py-3 text-right">{item.tax}%</td>
                  <td className="py-3 text-right font-medium">
                    {mockInvoice.currency}{" "}
                    {(item.qty * item.rate * (1 + item.tax / 100)).toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-5 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex w-48 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{mockInvoice.currency} {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex w-48 justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{mockInvoice.currency} {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator className="my-1 w-48" />
            <div className="flex w-48 justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{mockInvoice.currency} {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {mockInvoice.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-xs font-medium">Notes</p>
                <p className="mt-1 text-xs text-muted-foreground">{mockInvoice.notes}</p>
              </div>
            </>
          )}

          <Separator className="my-6" />
          <p className="text-center text-[10px] text-muted-foreground">
            Powered by Travada Books
          </p>
        </div>
      </div>
    </div>
  )
}
