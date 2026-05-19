import { useState } from "react"
import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, User02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@travada-books/ui/components/table"
import { CustomerActions } from "@/components/customers/customer-actions"
import { EmptyState } from "@/components/shared/empty-state"

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  invoiceCount: number
  outstanding: number
  currency: string
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Acme Ltd",
    email: "billing@acme.co.ke",
    phone: "+254 700 000 001",
    invoiceCount: 2,
    outstanding: 5000,
    currency: "KES",
  },
  {
    id: "2",
    name: "Callfast Services LTD",
    email: "billing@callfast.co.ke",
    phone: "+254 700 000 002",
    invoiceCount: 1,
    outstanding: 0,
    currency: "KES",
  },
  {
    id: "3",
    name: "Studio X",
    email: "hello@studiox.io",
    phone: "+254 722 000 003",
    invoiceCount: 1,
    outstanding: 26000,
    currency: "KES",
  },
  {
    id: "4",
    name: "Nova Agency",
    email: "accounts@novaagency.co.ke",
    phone: "+254 733 000 004",
    invoiceCount: 1,
    outstanding: 12500,
    currency: "KES",
  },
]

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            color="currentColor"
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search customers..."
            className="pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm">+ New</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User02Icon}
          title="No customers yet"
          description="Add your first customer to get started."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Invoices</TableHead>
                <TableHead className="text-xs">Outstanding</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{customer.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{customer.phone}</TableCell>
                  <TableCell className="text-xs">{customer.invoiceCount}</TableCell>
                  <TableCell className="text-xs font-medium">
                    {customer.outstanding === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      `${customer.currency} ${customer.outstanding.toLocaleString("en-KE")}`
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <CustomerActions customerId={customer.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
