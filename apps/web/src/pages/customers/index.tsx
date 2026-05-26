import { useState } from "react"
import { useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { useAuth } from "@/contexts/auth-context"
import { listCustomers, deleteCustomer } from "@/lib/queries/customers"

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

export function CustomersPage() {
  const navigate = useNavigate()
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useTableScroll()

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => listCustomers(orgId!),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers", orgId] }),
  })

  function handleCustomerUpdated() {
    queryClient.invalidateQueries({ queryKey: ["customers", orgId] })
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const stats = {
    totalCount: customers.length,
    newThisMonth: customers.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length,
    totalOutstanding: 0,
    overdueCount: 0,
    topCustomer: undefined as { name: string; totalPaid: number } | undefined,
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg border bg-muted/40 animate-pulse" />
      </div>
    )
  }

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
                          <AvatarImage src={customer.logo_url ?? undefined} alt={customer.name} />
                          <AvatarFallback className="text-[10px]">
                            {customer.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ left: 220 }} className="py-3 text-xs text-muted-foreground sticky z-20 bg-background">
                      {customer.email ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.billing_email ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.main_contact ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.country ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.industry ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      {customer.company_type
                        ? <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{customer.company_type}</span>
                        : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {customer.website ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">—</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">—</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">—</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">—</TableCell>
                    <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                      <CustomerActions
                        customerId={customer.id}
                        customer={{
                          name: customer.name,
                          email: customer.email ?? "",
                          billToEmail: customer.billing_email ?? "",
                          phone: customer.phone ?? "",
                          mainContact: customer.main_contact ?? "",
                          industry: customer.industry ?? "",
                          businessType: customer.company_type ?? "",
                          website: customer.website ?? "",
                          vatNumber: customer.vat_number ?? "",
                          country: customer.country ?? "",
                          currency: customer.preferred_currency ?? "KES",
                          addressLine1: customer.address_line1 ?? "",
                          addressLine2: customer.address_line2 ?? "",
                          city: customer.city ?? "",
                          state: customer.state ?? "",
                          zip: customer.zip ?? "",
                          note: customer.note ?? "",
                        }}
                        onDelete={() => deleteMutation.mutate(customer.id)}
                        onUpdated={handleCustomerUpdated}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        </div>
      )}

      <CreateCustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["customers", orgId] })}
      />
    </div>
  )
}
