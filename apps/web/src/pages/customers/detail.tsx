import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft01Icon,
  Delete01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PlusSignIcon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@travada-books/ui/components/avatar";
import { Separator } from "@travada-books/ui/components/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
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
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { EditCustomerSheet } from "@/components/customers/edit-customer-sheet";
import { GenerateStatementSheet } from "@/components/customers/generate-statement-sheet";
import { getCustomer, deleteCustomer } from "@/lib/queries/customers";
import {
  listCustomerInvoices,
  getCustomerInvoiceSummary,
} from "@/lib/queries/invoices";
import { listCustomerStatements } from "@/lib/queries/statements";
import { type Invoice } from "@/components/invoices/invoice-table";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";
import { toast } from "sonner";

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
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuth();
  const { formatDate, formatMonthDay } = useFormatDate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: invoiceSummary } = useQuery({
    queryKey: ["customer-invoice-summary", id],
    queryFn: () => getCustomerInvoiceSummary(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  const { data: customerInvoices = [] } = useQuery({
    queryKey: ["customer-invoices", id],
    queryFn: () => listCustomerInvoices(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  const { data: customerStatements = [] } = useQuery({
    queryKey: ["customer-statements", id],
    queryFn: () => listCustomerStatements(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id!, orgId!),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      toast.success("Customer deleted");
      navigate("/customers");
    },
    onError: () => {
      toast.error("Failed to delete customer", {
        description: "Please try again.",
      });
    },
  });

  function handleDelete() {
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className='flex h-full flex-col overflow-hidden animate-pulse'>
        <div className='h-14 border-b' />
        <div className='grid grid-cols-4 gap-4 border-b p-4'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='h-24 rounded-lg border bg-muted/40' />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>
          An error occurred while loading the customer. Please try again.
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>Customer not found.</p>
      </div>
    );
  }

  const currency = customer.preferred_currency ?? "KES";

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
          <span className='text-sm font-medium'>{customer.name}</span>
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
            onClick={() => navigate(`/invoices/create?customerId=${id}`)}
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
            <DropdownMenuContent align='end' className='w-full'>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
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
                {invoiceSummary ?
                  `${currency} ${invoiceSummary.totalInvoiced.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                : "—"}
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
                {invoiceSummary ?
                  `${currency} ${invoiceSummary.totalPaid.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                : "—"}
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
              <p className='text-xl font-semibold tracking-tight'>
                {invoiceSummary ?
                  `${currency} ${invoiceSummary.outstanding.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                : "—"}
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
                {invoiceSummary ? invoiceSummary.invoiceCount : "—"}
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
          <div className='rounded-lg border bg-background p-4'>
            <div className='flex flex-col items-center gap-3 text-center'>
              <Avatar className='size-14'>
                <AvatarImage src={customer.logo_url ?? undefined} />
                <AvatarFallback className='text-base font-semibold'>
                  {customer.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold text-sm'>{customer.name}</p>
                {customer.main_contact && (
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {customer.main_contact}
                  </p>
                )}
              </div>
            </div>

            <Separator className='my-4' />

            <div className='flex flex-col gap-0 divide-y'>
              {customer.email && (
                <InfoRow label='Email' value={customer.email} />
              )}
              {customer.billing_email &&
                customer.billing_email !== customer.email && (
                  <InfoRow label='Bill to' value={customer.billing_email} />
                )}
              {customer.phone && (
                <InfoRow label='Phone' value={customer.phone} />
              )}
            </div>
          </div>

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
                    {customer.industry && (
                      <InfoRow label='Industry' value={customer.industry} />
                    )}
                    {customer.company_type && (
                      <InfoRow label='Type' value={customer.company_type} />
                    )}
                    {customer.website && (
                      <InfoRow label='Website' value={customer.website} />
                    )}
                    {customer.vat_number && (
                      <InfoRow
                        label='VAT / KRA PIN'
                        value={customer.vat_number}
                      />
                    )}
                    {currency && (
                      <InfoRow label='Default Currency' value={currency} />
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
                    {customer.address_line1 && (
                      <InfoRow
                        label='Address Line 1'
                        value={customer.address_line1}
                      />
                    )}
                    {customer.address_line2 && (
                      <InfoRow
                        label='Address Line 2'
                        value={customer.address_line2}
                      />
                    )}
                    {customer.city && (
                      <InfoRow label='City' value={customer.city} />
                    )}
                    {customer.state && (
                      <InfoRow label='State / County' value={customer.state} />
                    )}
                    {customer.zip && (
                      <InfoRow label='ZIP' value={customer.zip} />
                    )}
                    {customer.country && (
                      <InfoRow label='Country' value={customer.country} />
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
                    {customer.enrichment_status === "done" && (
                      <span className='rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400'>
                        Enriched
                      </span>
                    )}
                    {customer.enrichment_status === "pending" && (
                      <span className='rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
                        Pending
                      </span>
                    )}
                    {customer.enrichment_status === "failed" && (
                      <span className='rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive'>
                        Failed
                      </span>
                    )}
                    {!customer.enrichment_status && (
                      <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                        Not enriched
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {!customer.enrichment_status ?
                    <p className='pb-4 text-xs text-muted-foreground'>
                      Enrichment runs automatically when an email is set. Add an
                      email to trigger it.
                    </p>
                  : <div className='flex flex-col gap-3 pb-4'>
                      {customer.description && (
                        <p className='text-xs text-muted-foreground leading-relaxed'>
                          {customer.description}
                        </p>
                      )}
                      <div className='divide-y'>
                        {customer.ceo_name && (
                          <InfoRow label='CEO' value={customer.ceo_name} />
                        )}
                        {customer.founded_year && (
                          <InfoRow
                            label='Founded'
                            value={String(customer.founded_year)}
                          />
                        )}
                        {customer.employee_count && (
                          <InfoRow
                            label='Employees'
                            value={String(customer.employee_count)}
                          />
                        )}
                        {customer.estimated_revenue && (
                          <InfoRow
                            label='Est. Revenue'
                            value={customer.estimated_revenue}
                          />
                        )}
                        {customer.funding_stage && (
                          <InfoRow
                            label='Funding Stage'
                            value={customer.funding_stage}
                          />
                        )}
                        {customer.total_funding && (
                          <InfoRow
                            label='Total Funding'
                            value={customer.total_funding}
                          />
                        )}
                        {customer.headquarters_location && (
                          <InfoRow
                            label='HQ'
                            value={customer.headquarters_location}
                          />
                        )}
                        {customer.fiscal_year_end && (
                          <InfoRow
                            label='Fiscal Year End'
                            value={customer.fiscal_year_end}
                          />
                        )}
                        {customer.finance_contact && (
                          <InfoRow
                            label='Finance Contact'
                            value={customer.finance_contact}
                          />
                        )}
                        {customer.finance_contact_email && (
                          <InfoRow
                            label='Finance Email'
                            value={customer.finance_contact_email}
                          />
                        )}
                      </div>
                      {(customer.linkedin_url ||
                        customer.twitter_url ||
                        customer.instagram_url ||
                        customer.facebook_url) && (
                        <div className='flex flex-wrap gap-2'>
                          {customer.linkedin_url && (
                            <a
                              href={customer.linkedin_url}
                              target='_blank'
                              rel='noreferrer'
                              className='text-[11px] text-muted-foreground underline-offset-4 hover:underline'
                            >
                              LinkedIn
                            </a>
                          )}
                          {customer.twitter_url && (
                            <a
                              href={customer.twitter_url}
                              target='_blank'
                              rel='noreferrer'
                              className='text-[11px] text-muted-foreground underline-offset-4 hover:underline'
                            >
                              Twitter / X
                            </a>
                          )}
                          {customer.instagram_url && (
                            <a
                              href={customer.instagram_url}
                              target='_blank'
                              rel='noreferrer'
                              className='text-[11px] text-muted-foreground underline-offset-4 hover:underline'
                            >
                              Instagram
                            </a>
                          )}
                          {customer.facebook_url && (
                            <a
                              href={customer.facebook_url}
                              target='_blank'
                              rel='noreferrer'
                              className='text-[11px] text-muted-foreground underline-offset-4 hover:underline'
                            >
                              Facebook
                            </a>
                          )}
                        </div>
                      )}
                      {customer.enriched_at && (
                        <p className='text-[10px] text-muted-foreground/60'>
                          Last enriched{" "}
                          {new Date(customer.enriched_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  }
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {customer.note && (
            <div className='rounded-lg border bg-background p-4'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Note
              </p>
              <p className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                {customer.note}
              </p>
            </div>
          )}
        </div>

        {/* Right main area — invoice history + statement history */}
        <div className='flex flex-1 flex-col overflow-y-auto p-6 gap-8'>
          <div>
            <p className='mb-4 text-sm font-medium'>Invoice history</p>
            <InvoiceTable
              data={customerInvoices.map((inv) => ({
                id: inv.id,
                number: inv.invoice_number ?? "—",
                status: inv.status as Invoice["status"],
                customer: inv.customer_name,
                amount: inv.total ?? 0,
                currency: inv.currency,
                dueDate: inv.due_date ? formatDate(inv.due_date) : null,
                issueDate: inv.issue_date ? formatDate(inv.issue_date) : null,
                recurring: inv.recurring,
                token: inv.token,
              }))}
            />
          </div>

          <div>
            <p className='mb-4 text-sm font-medium'>Statement history</p>
            {customerStatements.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No statements generated yet.</p>
            ) : (
              <div className='rounded-lg border bg-background divide-y'>
                {customerStatements.map((stmt) => {
                  const from = formatMonthDay(stmt.date_from)
                  const to = formatMonthDay(stmt.date_to)
                  return (
                    <button
                      key={stmt.id}
                      onClick={() => navigate(`/statements/${stmt.id}`)}
                      className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors'
                    >
                      <div>
                        <p className='text-xs font-medium'>{from} – {to}</p>
                        <p className='text-[11px] text-muted-foreground mt-0.5'>
                          {stmt.snapshot_data?.length ?? 0} invoice{(stmt.snapshot_data?.length ?? 0) !== 1 ? "s" : ""} · Generated {formatMonthDay(stmt.created_at)}
                        </p>
                      </div>
                      <ArrowLeft01Icon size={13} className='text-muted-foreground rotate-180 shrink-0' />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customer.name}</strong> will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GenerateStatementSheet
        open={statementOpen}
        onOpenChange={setStatementOpen}
        customerName={customer.name}
        customerId={customer.id}
        customerDetails={{
          name: customer.name,
          email: customer.email ?? null,
          billing_email: customer.billing_email ?? null,
          phone: customer.phone ?? null,
          address_line1: customer.address_line1 ?? null,
          address_line2: customer.address_line2 ?? null,
          city: customer.city ?? null,
          zip: customer.zip ?? null,
          country: customer.country ?? null,
        }}
      />
      <EditCustomerSheet
        open={editOpen}
        onOpenChange={setEditOpen}
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
          country: customer.country_code ?? customer.country ?? "",
          currency: customer.preferred_currency ?? undefined,
          addressLine1: customer.address_line1 ?? "",
          addressLine2: customer.address_line2 ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          zip: customer.zip ?? "",
          note: customer.note ?? "",
        }}
        onUpdated={() =>
          queryClient.invalidateQueries({ queryKey: ["customer", id] })
        }
      />
    </div>
  );
}
