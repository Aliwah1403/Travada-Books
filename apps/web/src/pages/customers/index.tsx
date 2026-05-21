import { useState } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, FilterIcon, PlusSignIcon, Search01Icon, User02Icon } from "@travada-books/ui/icons"
import { format } from "date-fns"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Avatar, AvatarFallback, AvatarImage } from "@travada-books/ui/components/avatar"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table"
import { CustomerActions } from "@/components/customers/customer-actions"
import { CustomerStats } from "@/components/customers/customer-stats"
import { CreateCustomerSheet } from "@/components/customers/create-customer-sheet"
import { EmptyState } from "@/components/shared/empty-state"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { cn } from "@travada-books/ui/lib/utils"

type Customer = {
  id: string
  name: string
  email: string
  billToEmail: string | null
  phone: string
  country: string
  industry: string | null
  businessType: string | null
  website: string | null
  logo: string | null
  mainContact: string | null
  invoiceCount: number
  outstanding: number
  totalInvoiced: number
  totalPaid: number
  currency: string
  hasOverdue: boolean
  addedAt: Date
  lastInvoiceAt: Date | null
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Acme Ltd",
    email: "info@acme.co.ke",
    billToEmail: "billing@acme.co.ke",
    phone: "+254 700 000 001",
    country: "Kenya",
    industry: "Technology",
    businessType: "B2B",
    website: "acme.co.ke",
    logo: null,
    mainContact: "James Mwangi",
    invoiceCount: 2,
    outstanding: 5000,
    totalInvoiced: 30000,
    totalPaid: 25000,
    currency: "KES",
    hasOverdue: false,
    addedAt: new Date("2025-05-01"),
    lastInvoiceAt: new Date("2025-06-01"),
  },
  {
    id: "2",
    name: "Callfast Services LTD",
    email: "billing@callfast.co.ke",
    billToEmail: null,
    phone: "+254 700 000 002",
    country: "Kenya",
    industry: "Telecommunications",
    businessType: "B2C",
    website: "callfast.co.ke",
    logo: "https://www.google.com/s2/favicons?domain=callfast.co.ke&sz=32",
    mainContact: "Sarah Otieno",
    invoiceCount: 3,
    outstanding: 0,
    totalInvoiced: 77670,
    totalPaid: 77670,
    currency: "KES",
    hasOverdue: false,
    addedAt: new Date("2025-03-12"),
    lastInvoiceAt: new Date("2025-11-20"),
  },
  {
    id: "3",
    name: "Studio X",
    email: "hello@studiox.io",
    billToEmail: "accounts@studiox.io",
    phone: "+254 722 000 003",
    country: "Kenya",
    industry: "Design & Creative",
    businessType: "B2B",
    website: "studiox.io",
    logo: "https://www.google.com/s2/favicons?domain=studiox.io&sz=32",
    mainContact: null,
    invoiceCount: 1,
    outstanding: 26000,
    totalInvoiced: 26000,
    totalPaid: 0,
    currency: "KES",
    hasOverdue: true,
    addedAt: new Date("2025-04-28"),
    lastInvoiceAt: new Date("2025-04-01"),
  },
  {
    id: "4",
    name: "Nova Agency",
    email: "accounts@novaagency.co.ke",
    billToEmail: null,
    phone: "+254 733 000 004",
    country: "Kenya",
    industry: "Marketing & Advertising",
    businessType: "SaaS",
    website: "novaagency.co.ke",
    logo: null,
    mainContact: "Peter Kamau",
    invoiceCount: 1,
    outstanding: 12500,
    totalInvoiced: 12500,
    totalPaid: 0,
    currency: "KES",
    hasOverdue: true,
    addedAt: new Date("2025-05-15"),
    lastInvoiceAt: new Date("2025-06-15"),
  },
]

function HorizontalPagination({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}: {
  canScrollLeft: boolean
  canScrollRight: boolean
  onScrollLeft: () => void
  onScrollRight: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canScrollLeft}
        onClick={onScrollLeft}
        aria-label="Scroll left"
      >
        <ArrowLeft01Icon size={13} className={cn(canScrollLeft ? "text-foreground" : "text-muted-foreground")} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canScrollRight}
        onClick={onScrollRight}
        aria-label="Scroll right"
      >
        <ArrowRight01Icon size={13} className={cn(canScrollRight ? "text-foreground" : "text-muted-foreground")} />
      </Button>
    </div>
  )
}

function getStats(customers: Customer[]) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const totalCount = customers.length
  const newThisMonth = customers.filter((c) => c.addedAt >= thirtyDaysAgo).length
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0)
  const overdueCount = customers.filter((c) => c.hasOverdue).length
  const topCustomer = [...customers].sort((a, b) => b.totalPaid - a.totalPaid)[0]

  return { totalCount, newThisMonth, totalOutstanding, overdueCount, topCustomer }
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useTableScroll()

  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = getStats(mockCustomers)

  return (
    <div className="flex flex-col gap-6 p-6">
      <CustomerStats {...stats} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search01Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="h-10 w-80 pl-8 pr-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" className="size-10">
            <FilterIcon size={14} />
          </Button>
        </div>
        <Button className="gap-1.5" onClick={() => setSheetOpen(true)}>
          <PlusSignIcon size={13} />
          New Customer
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User02Icon}
          title="No customers yet"
          description="Add your first customer to get started."
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div ref={containerRef} className="overflow-x-auto">
            <table className="w-full caption-bottom text-xs min-w-[1820px]">
              <TableHeader>
                <TableRow>
                  <TableHead style={{ minWidth: 220 }} className="h-12 px-4 text-xs sticky left-0 z-30 bg-background">Customer</TableHead>
                  <TableHead style={{ minWidth: 220, left: 220 }} className="h-12 px-4 text-xs sticky z-30 bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <span>Email</span>
                      <HorizontalPagination
                        canScrollLeft={canScrollLeft}
                        canScrollRight={canScrollRight}
                        onScrollLeft={scrollLeft}
                        onScrollRight={scrollRight}
                      />
                    </div>
                  </TableHead>
                  <TableHead style={{ minWidth: 220 }} className="h-12 px-4 text-xs">Bill To</TableHead>
                  <TableHead style={{ minWidth: 160 }} className="h-12 px-4 text-xs">Main Contact</TableHead>
                  <TableHead style={{ minWidth: 120 }} className="h-12 px-4 text-xs">Country</TableHead>
                  <TableHead style={{ minWidth: 160 }} className="h-12 px-4 text-xs">Industry</TableHead>
                  <TableHead style={{ minWidth: 130 }} className="h-12 px-4 text-xs">Business Type</TableHead>
                  <TableHead style={{ minWidth: 150 }} className="h-12 px-4 text-xs">Website</TableHead>
                  <TableHead style={{ minWidth: 100 }} className="h-12 px-4 text-xs">Invoices</TableHead>
                  <TableHead style={{ minWidth: 150 }} className="h-12 px-4 text-xs">Total Paid</TableHead>
                  <TableHead style={{ minWidth: 150 }} className="h-12 px-4 text-xs">Outstanding</TableHead>
                  <TableHead style={{ minWidth: 130 }} className="h-12 px-4 text-xs">Last Invoice</TableHead>
                  <TableHead style={{ minWidth: 52 }} className="h-12 w-13" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <TableCell className="py-3 sticky left-0 z-20 bg-background">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 rounded-sm">
                          <AvatarImage src={customer.logo ?? undefined} alt={customer.name} />
                          <AvatarFallback className="text-[10px]">
                            {customer.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ left: 220 }} className="py-3 text-xs text-muted-foreground sticky z-20 bg-background">{customer.email}</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.billToEmail ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.mainContact ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">{customer.country}</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.industry ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      {customer.businessType
                        ? <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{customer.businessType}</span>
                        : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.website ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs">{customer.invoiceCount}</TableCell>
                    <TableCell className="py-3 text-xs font-medium">
                      {customer.totalPaid === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${customer.currency} ${customer.totalPaid.toLocaleString("en-KE")}`
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs font-medium">
                      {customer.outstanding === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${customer.currency} ${customer.outstanding.toLocaleString("en-KE")}`
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.lastInvoiceAt ? format(customer.lastInvoiceAt, "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                      <CustomerActions
                        customerId={customer.id}
                        customer={{
                          name: customer.name,
                          email: customer.email,
                          billToEmail: customer.billToEmail ?? "",
                          phone: customer.phone,
                          mainContact: customer.mainContact ?? "",
                          industry: customer.industry ?? "",
                          businessType: customer.businessType ?? "",
                          website: customer.website ?? "",
                          vatNumber: "",
                          country: customer.country,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        </div>
      )}

      <CreateCustomerSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
