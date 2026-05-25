import { useParams } from "react-router"
import { format } from "date-fns"
import { Copy01Icon, Download01Icon } from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import { cn } from "@travada-books/ui/lib/utils"
import { useTheme } from "@/components/theme-provider"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

type StatementEntry = {
  date: string
  description: string
  invoiceNumber?: string
  debit: number
  credit: number
  balance: number
}

const mockStatement = {
  number: "STMT-0001",
  customerName: "Acme Ltd",
  customerEmail: "billing@acme.co.ke",
  currency: "KES",
  dateFrom: "01/01/2025",
  dateTo: "31/05/2025",
  generatedAt: new Date("2025-05-21T09:00:00"),
  openingBalance: 0,
  closingBalance: 5000,
  notes: "Please review and confirm your balance with us.",
  entries: [
    {
      date: "01/02/2025",
      description: "Invoice issued",
      invoiceNumber: "INV-0002",
      debit: 25890,
      credit: 0,
      balance: 25890,
    },
    {
      date: "15/02/2025",
      description: "Payment received",
      invoiceNumber: "INV-0002",
      debit: 0,
      credit: 25890,
      balance: 0,
    },
    {
      date: "01/06/2025",
      description: "Invoice issued",
      invoiceNumber: "INV-0001",
      debit: 5000,
      credit: 0,
      balance: 5000,
    },
  ] satisfies StatementEntry[],
}

export function PublicStatementPage() {
  useParams()
  const { theme } = useTheme()
  const logo = theme === "dark" ? LogoLime : LogoGreen

  const { currency, openingBalance, closingBalance, entries } = mockStatement
  const totalDebits = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredits = entries.reduce((s, e) => s + e.credit, 0)

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Travada Books" className="size-6" />
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={handleCopyLink}>
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-1.5">
            <Download01Icon size={13} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Statement */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
          {/* Letterhead */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                TB
              </div>
              <p className="mt-2 font-semibold text-foreground">
                Your Business Name
              </p>
              <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">STATEMENT</p>
              <p className="text-xs text-muted-foreground">
                {mockStatement.number}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill to + period */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prepared for
              </p>
              <p className="mt-1.5 font-medium text-foreground">
                {mockStatement.customerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {mockStatement.customerEmail}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Statement date:</span>
                <span className="font-medium">
                  {format(mockStatement.generatedAt, "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Period from:</span>
                <span className="font-medium">{mockStatement.dateFrom}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Period to:</span>
                <span className="font-medium">{mockStatement.dateTo}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-medium">{currency}</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Ledger table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 text-left font-medium">Date</th>
                <th className="pb-3 text-left font-medium">Description</th>
                <th className="pb-3 text-left font-medium">Invoice #</th>
                <th className="pb-3 text-right font-medium">Charges</th>
                <th className="pb-3 text-right font-medium">Payments</th>
                <th className="pb-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dashed bg-muted/30">
                <td className="py-2.5 text-muted-foreground">—</td>
                <td className="py-2.5 font-medium" colSpan={2}>
                  Opening balance
                </td>
                <td className="py-2.5 text-right text-muted-foreground">—</td>
                <td className="py-2.5 text-right text-muted-foreground">—</td>
                <td className="py-2.5 text-right font-medium">
                  {currency}{" "}
                  {openingBalance.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {entries.map((entry, i) => (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-2.5 text-muted-foreground">{entry.date}</td>
                  <td className="py-2.5">{entry.description}</td>
                  <td className="py-2.5 font-mono text-muted-foreground">
                    {entry.invoiceNumber ?? "—"}
                  </td>
                  <td className="py-2.5 text-right">
                    {entry.debit > 0 ? (
                      `${currency} ${entry.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-green-600 dark:text-green-400">
                    {entry.credit > 0 ? (
                      `${currency} ${entry.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right font-medium",
                      entry.balance > 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {currency}{" "}
                    {entry.balance.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-6 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex w-56 justify-between">
              <span className="text-muted-foreground">Total charges</span>
              <span>
                {currency}{" "}
                {totalDebits.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex w-56 justify-between">
              <span className="text-muted-foreground">Total payments</span>
              <span className="text-green-600 dark:text-green-400">
                {currency}{" "}
                {totalCredits.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <Separator className="my-1 w-56" />
            <div className="flex w-56 justify-between text-sm font-semibold">
              <span>Closing balance</span>
              <span
                className={cn(
                  closingBalance > 0 && "text-red-600 dark:text-red-400",
                )}
              >
                {currency}{" "}
                {closingBalance.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {mockStatement.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-xs font-medium">Notes</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mockStatement.notes}
                </p>
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
