import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  Search01Icon,
  Cancel01Icon,
  FilterIcon,
} from "@travada-books/ui/icons";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { type Transaction } from "@/components/transactions/transaction-columns";

const DUMMY_TRANSACTIONS: Transaction[] = [
  {
    id: "1", date: "09 Jun 2026", name: "Consulting – Acme Ltd",
    counterpartyName: "Acme Ltd",
    categoryName: "Consulting Fees", categoryColor: "#6366f1",
    amount: 85000, currency: "KES",
    taxAmount: 13600, taxRate: 16, taxType: "vat",
    status: "completed", paymentMode: "bank_transfer",
    recurring: false, frequency: null, internal: false,
    referenceNumber: null, linkedInvoiceNumber: "INV-0042",
  },
  {
    id: "2", date: "08 Jun 2026", name: "AWS subscription",
    counterpartyName: "Amazon Web Services",
    categoryName: "Software & Subscriptions", categoryColor: "#06b6d4",
    amount: -3200, currency: "KES",
    taxAmount: null, taxRate: null, taxType: null,
    status: "completed", paymentMode: "card",
    recurring: true, frequency: "monthly", internal: false,
    referenceNumber: null, linkedInvoiceNumber: null,
  },
  {
    id: "3", date: "07 Jun 2026", name: "Office rent – June",
    counterpartyName: "Westlands Business Park",
    categoryName: "Rent & Facilities", categoryColor: "#f97316",
    amount: -45000, currency: "KES",
    taxAmount: null, taxRate: null, taxType: null,
    status: "completed", paymentMode: "bank_transfer",
    recurring: true, frequency: "monthly", internal: false,
    referenceNumber: "CHCK-0042", linkedInvoiceNumber: null,
  },
  {
    id: "4", date: "05 Jun 2026", name: "Service retainer – Zenith Co.",
    counterpartyName: "Zenith Co.",
    categoryName: "Service Income", categoryColor: "#10b981",
    amount: 120000, currency: "KES",
    taxAmount: 19200, taxRate: 16, taxType: "vat",
    status: "completed", paymentMode: "mpesa",
    recurring: false, frequency: null, internal: false,
    referenceNumber: "QGH7X23YK", linkedInvoiceNumber: "INV-0038",
  },
  {
    id: "5", date: "03 Jun 2026", name: "Safaricom internet",
    counterpartyName: "Safaricom PLC",
    categoryName: "Internet & Phone", categoryColor: "#8b5cf6",
    amount: -6000, currency: "KES",
    taxAmount: null, taxRate: null, taxType: null,
    status: "pending", paymentMode: "mpesa",
    recurring: true, frequency: "monthly", internal: false,
    referenceNumber: null, linkedInvoiceNumber: null,
  },
  {
    id: "6", date: "02 Jun 2026", name: "Team lunch – client meeting",
    counterpartyName: "Java House",
    categoryName: "Meals & Entertainment", categoryColor: "#ec4899",
    amount: -8400, currency: "KES",
    taxAmount: null, taxRate: null, taxType: null,
    status: "completed", paymentMode: "cash",
    recurring: false, frequency: null, internal: false,
    referenceNumber: null, linkedInvoiceNumber: null,
  },
  {
    id: "7", date: "01 Jun 2026", name: "Freelance design invoice",
    counterpartyName: "Wanjiku Creative Studio",
    categoryName: "Contractors & Freelancers", categoryColor: "#f59e0b",
    amount: -25000, currency: "KES",
    taxAmount: 5000, taxRate: null, taxType: "wht",
    status: "completed", paymentMode: "mpesa",
    recurring: false, frequency: null, internal: false,
    referenceNumber: "QBX9K12ZT", linkedInvoiceNumber: null,
  },
  {
    id: "8", date: "28 May 2026", name: "Sales commission – May",
    counterpartyName: null,
    categoryName: "Commission", categoryColor: "#14b8a6",
    amount: 32500, currency: "KES",
    taxAmount: null, taxRate: null, taxType: null,
    status: "completed", paymentMode: "bank_transfer",
    recurring: false, frequency: null, internal: false,
    referenceNumber: null, linkedInvoiceNumber: null,
  },
];

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingTransaction = editingId
    ? (DUMMY_TRANSACTIONS.find((t) => t.id === editingId) ?? null)
    : null;

  function handleEdit(id: string) {
    setEditingId(id);
    setSheetOpen(true);
  }

  function handleDelete(_id: string) {
    // no-op until data layer is wired
  }

  function handleNewTransaction() {
    setEditingId(null);
    setSheetOpen(true);
  }

  return (
    <div className='flex flex-col gap-6 p-6'>
      {/* Toolbar */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center justify-center gap-2'>
          <div className='relative'>
            <Search01Icon
              size={14}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              placeholder='Search transactions…'
              className='h-10 w-80 pl-8 pr-8 text-xs'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground transition-colors'
              >
                <Cancel01Icon size={13} />
              </button>
            )}
          </div>
          <Button variant='outline' size='icon' className='size-10'>
            <FilterIcon size={14} />
          </Button>
        </div>

        <Button className='h-10' onClick={handleNewTransaction}>
          + New Transaction
        </Button>
      </div>

      <TransactionTable
        data={DUMMY_TRANSACTIONS}
        globalFilter={search}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingId(null);
        }}
        transaction={editingTransaction}
      />
    </div>
  );
}
