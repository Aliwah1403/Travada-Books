import { useParams } from "react-router"
import { Copy01Icon, Download01Icon, Wallet01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import { useTheme } from "@/components/theme-provider"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

const mockInvoice = {
  number: "INV-0002",
  customer: "Callfast Services LTD",
  customerEmail: "billing@callfast.co.ke",
  issueDate: "20/11/2024",
  dueDate: "09/12/2024",
  currency: "KES",
  items: [
    { description: "Web Development Services", qty: 1, rate: 20000, tax: 16 },
    { description: "Hosting & Maintenance (1 year)", qty: 1, rate: 5890, tax: 0 },
  ],
  notes: "Thank you for your business.",
}

export function PublicInvoicePage() {
  const { token } = useParams()
  const { theme } = useTheme()
  const logo = theme === "dark" ? LogoLime : LogoGreen

  const subtotal = mockInvoice.items.reduce((sum, item) => sum + item.qty * item.rate, 0)
  const tax = mockInvoice.items.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.tax / 100),
    0
  )
  const total = subtotal + tax

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Travada Books" className="size-6" />
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5">
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-1.5">
            <Download01Icon size={13} />
            Download PDF
          </Button>
          <Button className="gap-1.5">
            <Wallet01Icon size={13} />
            Pay Invoice
          </Button>
        </div>
      </div>

      {/* Invoice */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                TB
              </div>
              <p className="mt-2 font-semibold text-foreground">Your Business Name</p>
              <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
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
            Powered by{" "}
            <a
              href="https://travadasys.com"
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Travada Books
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
