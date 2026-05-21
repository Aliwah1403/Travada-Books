import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft01Icon,
  Delete01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PlusSignIcon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@travada-books/ui/components/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { Card, CardContent } from "@travada-books/ui/components/card";
import {
  InvoiceTable,
  type Invoice,
} from "@/components/invoices/invoice-table";
import { EditCustomerSheet } from "@/components/customers/edit-customer-sheet";
import { GenerateStatementSheet } from "@/components/customers/generate-statement-sheet";

const mockCustomer = {
  id: "1",
  name: "Acme Ltd",
  email: "info@acme.co.ke",
  billToEmail: "billing@acme.co.ke",
  phone: "+254 700 000 001",
  mainContact: "Jane Doe",
  industry: "Technology",
  businessType: "B2B",
  website: "acme.co.ke",
  vatNumber: "P051234567A",
  country: "Kenya",
  defaultCurrency: "KES",
  totalInvoiced: 30890,
  totalPaid: 25890,
  totalOwed: 5000,
  currency: "KES",
  enriched: {
    description:
      "Acme Ltd is a Nairobi-based technology company specialising in enterprise software solutions and cloud infrastructure for the East African market.",
    founded: "2016",
    employees: "50–200",
    linkedIn: "linkedin.com/company/acme-ke",
    services: ["Cloud Infrastructure", "Enterprise SaaS", "IT Consulting"],
    enrichedAt: "May 2025",
  },
};

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
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-4 py-2.5 text-xs'>
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <span className='font-medium text-right'>{value}</span>
    </div>
  );
}

export function CustomerDetailPage() {
  const navigate = useNavigate();
  useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  const { currency, totalInvoiced, totalPaid, totalOwed, enriched } =
    mockCustomer;

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Header bar */}
      <div className='flex shrink-0 items-center justify-between border-b px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <span className='text-sm font-medium'>{mockCustomer.name}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={() => setStatementOpen(true)}
          >
            Statement
          </Button>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={() => navigate("/invoices/create")}
          >
            <PlusSignIcon size={13} />
            New Invoice
          </Button>
          <Button variant='outline' onClick={() => setEditOpen(true)}>
            <PencilEdit01Icon size={13} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='outline' />}>
              <MoreHorizontalIcon size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-full">
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-destructive focus:text-destructive'>
                <Delete01Icon size={13} />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI row */}
      <div className='grid shrink-0 grid-cols-4 gap-4 border-b p-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col justify-between gap-3'>
              <p className='text-xl font-semibold tracking-tight'>
                {currency} {totalInvoiced.toLocaleString("en-KE")}
              </p>
              <div>
                <p className='text-sm'>Total Invoiced</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>
                  Lifetime value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col justify-between gap-3'>
              <p className='text-xl font-semibold tracking-tight text-green-600 dark:text-green-400'>
                {currency} {totalPaid.toLocaleString("en-KE")}
              </p>
              <div>
                <p className='text-sm'>Total Paid</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>
                  Collected to date
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col justify-between gap-3'>
              <p className='text-xl font-semibold tracking-tight text-red-600 dark:text-red-400'>
                {currency} {totalOwed.toLocaleString("en-KE")}
              </p>
              <div>
                <p className='text-sm'>Outstanding</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>
                  Awaiting payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col justify-between gap-3'>
              <p className='text-xl font-semibold tracking-tight'>
                {mockCustomerInvoices.length}
              </p>
              <div>
                <p className='text-sm'>Invoices</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>
                  Total issued
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Body — two-column layout */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left sidebar — profile + details */}
        <div className='flex w-[400px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-4'>
          {/* General: avatar + contact info */}
          <div className='rounded-lg border bg-background p-4'>
            <div className='flex flex-col items-center gap-3 text-center'>
              <Avatar className='size-14'>
                <AvatarFallback className='text-base font-semibold'>
                  {mockCustomer.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold text-sm'>{mockCustomer.name}</p>
                {mockCustomer.mainContact && (
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {mockCustomer.mainContact}
                  </p>
                )}
              </div>
            </div>

            <Separator className='my-4' />

            <div className='flex flex-col gap-0 divide-y'>
              <InfoRow label='Email' value={mockCustomer.email} />
              {mockCustomer.billToEmail !== mockCustomer.email && (
                <InfoRow label='Bill to' value={mockCustomer.billToEmail} />
              )}
              {mockCustomer.phone && (
                <InfoRow label='Phone' value={mockCustomer.phone} />
              )}
            </div>
          </div>

          {/* Details accordion */}
          <div>
            <Accordion
              multiple
              defaultValue={["business", "location", "enrichment"]}
              className='rounded-lg border bg-background'
            >
              <AccordionItem value='business' className='px-4'>
                <AccordionTrigger className='py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline'>
                  Business Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className='divide-y'>
                    {mockCustomer.industry && (
                      <InfoRow label='Industry' value={mockCustomer.industry} />
                    )}
                    {mockCustomer.businessType && (
                      <InfoRow label='Type' value={mockCustomer.businessType} />
                    )}
                    {mockCustomer.website && (
                      <InfoRow label='Website' value={mockCustomer.website} />
                    )}
                    {mockCustomer.vatNumber && (
                      <InfoRow
                        label='VAT / KRA PIN'
                        value={mockCustomer.vatNumber}
                      />
                    )}
                    {mockCustomer.defaultCurrency && (
                      <InfoRow
                        label='Default Currency'
                        value={mockCustomer.defaultCurrency}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value='location' className='px-4'>
                <AccordionTrigger className='py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline'>
                  Location
                </AccordionTrigger>
                <AccordionContent>
                  <div className='divide-y'>
                    {mockCustomer.country && (
                      <InfoRow label='Country' value={mockCustomer.country} />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value='enrichment' className='px-4'>
                <AccordionTrigger className='py-3 hover:no-underline'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      AI Enrichment
                    </span>
                    <span className='rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400'>
                      Enriched
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-3'>
                    {enriched.description && (
                      <p className='text-xs text-muted-foreground leading-relaxed'>
                        {enriched.description}
                      </p>
                    )}
                    <div className='divide-y'>
                      {enriched.founded && (
                        <InfoRow label='Founded' value={enriched.founded} />
                      )}
                      {enriched.employees && (
                        <InfoRow label='Employees' value={enriched.employees} />
                      )}
                      {enriched.linkedIn && (
                        <InfoRow label='LinkedIn' value={enriched.linkedIn} />
                      )}
                      {enriched.services.length > 0 && (
                        <div className='flex flex-col gap-2 py-2.5 text-xs'>
                          <span className='text-muted-foreground'>
                            Services
                          </span>
                          <div className='flex flex-wrap gap-1'>
                            {enriched.services.map((s) => (
                              <span
                                key={s}
                                className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium'
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <InfoRow
                        label='Last enriched'
                        value={enriched.enrichedAt}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Right main area — invoice history */}
        <div className='flex flex-1 flex-col overflow-y-auto p-6'>
          <p className='mb-4 text-sm font-medium'>Invoice history</p>
          <InvoiceTable data={mockCustomerInvoices} />
        </div>
      </div>

      <GenerateStatementSheet
        open={statementOpen}
        onOpenChange={setStatementOpen}
        customerName={mockCustomer.name}
      />
      <EditCustomerSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={{
          name: mockCustomer.name,
          email: mockCustomer.email,
          billToEmail: mockCustomer.billToEmail,
          phone: mockCustomer.phone,
          mainContact: mockCustomer.mainContact,
          industry: mockCustomer.industry,
          businessType: mockCustomer.businessType,
          website: mockCustomer.website,
          vatNumber: mockCustomer.vatNumber,
          country: mockCustomer.country,
        }}
      />
    </div>
  );
}
