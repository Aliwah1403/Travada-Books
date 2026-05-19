import { useState } from "react";
import { useNavigate } from "react-router";
import { FilterIcon, Search01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import {
  InvoiceTable,
  type Invoice,
} from "@/components/invoices/invoice-table";

const mockInvoices: Invoice[] = [
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
    customer: "Callfast Services LTD",
    amount: 25890,
    currency: "KES",
    dueDate: "09/12/2024",
    issueDate: "20/11/2024",
    recurring: "one_time",
  },
  {
    id: "3",
    number: "INV-0003",
    status: "overdue",
    customer: "Studio X",
    amount: 200,
    currency: "USD",
    dueDate: "01/05/2025",
    issueDate: "01/04/2025",
    recurring: "recurring",
  },
  {
    id: "4",
    number: "INV-0004",
    status: "pending",
    customer: "Nova Agency",
    amount: 12500,
    currency: "KES",
    dueDate: "15/07/2025",
    issueDate: "15/06/2025",
    recurring: "one_time",
  },
];

function getStats(invoices: Invoice[]) {
  const open = invoices.filter(
    (i) => i.status === "pending" || i.status === "draft",
  );
  const overdue = invoices.filter((i) => i.status === "overdue");
  const paid = invoices.filter((i) => i.status === "paid");

  const sum = (arr: Invoice[]) =>
    arr.reduce(
      (acc, i) => acc + (i.currency === "KES" ? i.amount : i.amount * 130),
      0,
    );

  return {
    open: {
      label: "Open",
      amount: `KES ${sum(open).toLocaleString("en-KE")}`,
      count: open.length,
    },
    overdue: {
      label: "Overdue",
      amount: `KES ${sum(overdue).toLocaleString("en-KE")}`,
      count: overdue.length,
    },
    paid: {
      label: "Paid",
      amount: `KES ${sum(paid).toLocaleString("en-KE")}`,
      count: paid.length,
    },
  };
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const stats = getStats(mockInvoices);

  return (
    <div className='flex flex-col gap-6 p-6'>
      <InvoiceStats {...stats} />

      {/* Toolbar */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center justify-center gap-2'>
          <div className='relative'>
            <Search01Icon size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search invoices...'
              className='h-10 w-80 pl-8 pr-8 text-xs'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </div>
          <Button variant='outline' size='icon' className='size-10'>
            <FilterIcon size={14} />
          </Button>
        </div>

        <Button
          className='h-10 w-20'
          onClick={() => navigate("/invoices/create")}
        >
          + New
        </Button>
      </div>

      <InvoiceTable data={mockInvoices} globalFilter={search} />
    </div>
  );
}
