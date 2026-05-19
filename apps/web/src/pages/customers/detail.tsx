import { useNavigate, useParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@travada-books/ui/components/button"
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar"
import { Separator } from "@travada-books/ui/components/separator"
import { InvoiceTable, type Invoice } from "@/components/invoices/invoice-table"

const mockCustomer = {
  id: "1",
  name: "Acme Ltd",
  email: "billing@acme.co.ke",
  phone: "+254 700 000 001",
  address: "Westlands, Nairobi, Kenya",
  totalInvoiced: 30890,
  totalPaid: 25890,
  totalOwed: 5000,
  currency: "KES",
}

const mockCustomerInvoices: Invoice[] = [
  {
    id: "1",
    number: "INV-0001",
    status: "draft",
    customer: "Acme Ltd",
    amount: 5000,
    currency: "KES",
    dueDate: "30/06/2025",
    issueDate: "01/06/2025",
    recurring: "one_time",
  },
  {
    id: "2",
    number: "INV-0002",
    status: "paid",
    customer: "Acme Ltd",
    amount: 25890,
    currency: "KES",
    dueDate: "09/12/2024",
    issueDate: "20/11/2024",
    recurring: "one_time",
  },
]

export function CustomerDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/customers")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color="currentColor" strokeWidth={1.5} />
        </Button>
        <span className="text-sm text-muted-foreground">Customers</span>
      </div>

      {/* Customer card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm">
                {mockCustomer.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{mockCustomer.name}</p>
              <p className="text-xs text-muted-foreground">{mockCustomer.email}</p>
              <p className="text-xs text-muted-foreground">{mockCustomer.phone}</p>
              <p className="text-xs text-muted-foreground">{mockCustomer.address}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Edit</Button>
            <Button size="sm" onClick={() => navigate("/invoices/create")}>
              + New invoice
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total invoiced</p>
            <p className="mt-0.5 text-base font-semibold">
              {mockCustomer.currency} {mockCustomer.totalInvoiced.toLocaleString("en-KE")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="mt-0.5 text-base font-semibold text-green-600 dark:text-green-400">
              {mockCustomer.currency} {mockCustomer.totalPaid.toLocaleString("en-KE")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="mt-0.5 text-base font-semibold text-red-600 dark:text-red-400">
              {mockCustomer.currency} {mockCustomer.totalOwed.toLocaleString("en-KE")}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice history */}
      <div>
        <p className="mb-3 text-sm font-medium">Invoice history</p>
        <InvoiceTable data={mockCustomerInvoices} />
      </div>
    </div>
  )
}
