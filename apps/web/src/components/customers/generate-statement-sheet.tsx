import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod";
import { format } from "date-fns";
import {
  Copy01Icon,
  CheckmarkCircle01Icon,
  Sent02Icon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@travada-books/ui/components/sheet";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@travada-books/ui/components/field";
import { DatePicker } from "@/components/shared/date-picker";
import { Spinner } from "@/components/shared/spinner";
import { listCustomerInvoices } from "@/lib/queries/invoices";
import { createStatement } from "@/lib/queries/statements";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const schema = z
  .object({
    dateFrom: z.string().min(1, "Start date is required."),
    dateTo: z.string().min(1, "End date is required."),
    notes: z.string().optional(),
  })
  .refine((d) => d.dateTo >= d.dateFrom, {
    message: "End date must be after start date.",
    path: ["dateTo"],
  });

type FormValues = z.infer<typeof schema>;

type GenerateStatementSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerId: string;
  customerDetails: Record<string, unknown> | null;
};

export function GenerateStatementSheet({
  open,
  onOpenChange,
  customerName,
  customerId,
  customerDetails,
}: GenerateStatementSheetProps) {
  const { orgId, org } = useAuth();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedStatementId, setGeneratedStatementId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dateFrom: "", dateTo: "", notes: "" },
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: () => listCustomerInvoices(customerId),
    enabled: !!customerId && open,
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setGeneratedLink(null);
      setGeneratedStatementId(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(data: FormValues) {
    if (!orgId || !org) return;
    setIsSubmitting(true);

    try {
      const from = new Date(data.dateFrom);
      const to = new Date(data.dateTo);
      to.setHours(23, 59, 59, 999);

      const invoicesInRange = allInvoices.filter((inv) => {
        const d =
          inv.issue_date ? new Date(inv.issue_date) : new Date(inv.created_at);
        return d >= from && d <= to;
      });

      const snapshot = invoicesInRange.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        total: inv.total,
        currency: inv.currency,
        paid_at: inv.paid_at,
      }));

      const fromDetails = {
        name: org.name,
        logo_url: org.logo_url ?? null,
        address_line1: org.address_line1 ?? null,
        address_line2: org.address_line2 ?? null,
        city: org.city ?? null,
        zip: org.zip ?? null,
        country_code: org.country_code ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        tax_id: org.tax_id ?? null,
      };

      const statement = await createStatement({
        org_id: orgId,
        customer_id: customerId,
        date_from: format(from, "yyyy-MM-dd"),
        date_to: format(to, "yyyy-MM-dd"),
        notes: data.notes || null,
        snapshot_data: snapshot,
        from_details: fromDetails,
        customer_details: customerDetails,
      });

      setGeneratedLink(`${window.location.origin}/s/${statement.token}`);
      setGeneratedStatementId(statement.id);
    } catch {
      toast.error("Failed to generate statement", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyLink() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied to clipboard");
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='flex flex-col'>
        <SheetHeader className='px-6 pt-6'>
          <SheetTitle>Generate Statement</SheetTitle>
          <SheetDescription>
            Create an account statement for {customerName} covering a specific
            period.
          </SheetDescription>
        </SheetHeader>

        {generatedLink ?
          <div className='flex flex-1 flex-col'>
            <div className='flex flex-1 flex-col items-center justify-center gap-5 px-6'>
              <div className='flex size-12 items-center justify-center rounded-full bg-primary/10'>
                <CheckmarkCircle01Icon size={24} className='text-primary' />
              </div>
              <div className='text-center'>
                <p className='text-sm font-semibold'>Statement ready</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Share this link with {customerName}.
                </p>
              </div>
              <div className='w-full space-y-2'>
                <div className='flex gap-2'>
                  <Input
                    readOnly
                    value={generatedLink}
                    className='text-xs text-muted-foreground'
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant='outline'
                    onClick={copyLink}
                    title='Copy link'
                  >
                    <Copy01Icon size={13} />
                  </Button>
                </div>
                <Button
                  variant='outline'
                  className='w-full gap-1.5'
                  disabled
                  title='Email sending coming in a future update'
                >
                  <Sent02Icon size={13} />
                  Send to {customerName}
                </Button>
              </div>
            </div>
            <Separator />
            <div className='flex gap-2 px-6 py-4'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => {
                  form.reset();
                  setGeneratedLink(null);
                }}
              >
                Generate another
              </Button>
              <Button
                className='flex-1'
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        : <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-1 flex-col overflow-hidden'
            noValidate
          >
            <div className='flex flex-1 flex-col gap-5 overflow-auto px-6 py-5'>
              <Controller
                name='dateFrom'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      From <span className='text-destructive'>*</span>
                    </FieldLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) =>
                        field.onChange(date ? date.toISOString() : "")
                      }
                      placeholder='Select start date'
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='dateTo'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      To <span className='text-destructive'>*</span>
                    </FieldLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) =>
                        field.onChange(date ? date.toISOString() : "")
                      }
                      placeholder='Select end date'
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='notes'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Notes</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder='e.g. Please review and confirm your balance.'
                      className='text-xs'
                    />
                    <FieldDescription>
                      Optional message shown at the bottom of the statement.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className='rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed'>
                A unique shareable link will be generated. The statement
                captures a snapshot of all invoices in the selected period — you
                can resend the link at any time.
              </div>
            </div>

            <Separator />
            <SheetFooter className='flex-row gap-2 px-6 py-4'>
              <Button
                type='button'
                variant='outline'
                className='flex-1'
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='flex-1 gap-1.5'
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner size={13} />}
                {isSubmitting ? "Generating…" : "Generate Statement"}
              </Button>
            </SheetFooter>
          </form>
        }
      </SheetContent>
    </Sheet>
  );
}
