import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod";
import { format } from "date-fns";
import {
  Copy01Icon,
  CheckmarkCircle01Icon,
  Sent02Icon,
  ArrowRight01Icon,
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
import { Switch } from "@travada-books/ui/components/switch";
import { DatePicker } from "@/components/shared/date-picker";
import { Spinner } from "@/components/shared/spinner";
import { buildFromDetailsSnapshot, buildStatementSnapshot, STATEMENT_INVOICE_STATUSES } from "@travada-books/core";
import { listCustomerInvoices } from "@/lib/queries/invoices";
import { createStatement } from "@/lib/queries/statements";
import { listPaymentsForInvoices } from "@/lib/queries/payments";
import { apiWritesEnabled } from "@/lib/api-flags";
import { statementApi } from "@/lib/statement-api";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
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

/** Emails a statement: through the API when its flag is on, else the edge function directly. */
export async function sendStatementEmail(statementId: string): Promise<boolean> {
  if (apiWritesEnabled("statements")) return (await statementApi.send(statementId)).queued;
  const res = await supabase.functions.invoke("send-statement-email", { body: { statementId } });
  if (res.error) throw res.error;
  return !!(res.data as { queued?: boolean } | null)?.queued;
}

export function GenerateStatementSheet({
  open,
  onOpenChange,
  customerName,
  customerId,
  customerDetails,
}: GenerateStatementSheetProps) {
  const navigate = useNavigate();
  const { orgId, org } = useAuth();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedStatementId, setGeneratedStatementId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [includePdf, setIncludePdf] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dateFrom: "", dateTo: "", notes: "" },
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: () => listCustomerInvoices(customerId, orgId!),
    enabled: !!customerId && !!orgId && open,
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setGeneratedLink(null);
      setGeneratedStatementId(null);
      setIsSending(false);
      setHasSent(false);
      setIncludePdf(true);
    }
    onOpenChange(next);
  }

  // The original direct Supabase write, used while the API flag is off. What
  // goes on the statement comes from the same core rule the API uses.
  async function createDirect(dateFrom: string, dateTo: string, notes: string | null) {
    const billed = allInvoices.filter((inv) => STATEMENT_INVOICE_STATUSES.has(inv.status));
    const payments =
      billed.length > 0 ? await listPaymentsForInvoices(billed.map((inv) => inv.id), orgId!) : [];
    const snapshot = buildStatementSnapshot({
      invoices: allInvoices.map((inv) => ({ ...inv, amount_paid: inv.amount_paid ?? null })),
      payments,
      dateFrom,
      dateTo,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return createStatement({
      org_id: orgId!,
      customer_id: customerId,
      date_from: dateFrom,
      date_to: dateTo,
      notes,
      ...snapshot,
      from_details: buildFromDetailsSnapshot(org!, org!.logo_url ?? null),
      customer_details: customerDetails,
      include_pdf: includePdf,
    });
  }

  async function onSubmit(data: FormValues) {
    if (!orgId || !org) return;
    setIsSubmitting(true);

    try {
      // Calendar dates (yyyy-MM-dd) in the user's local zone; the date
      // pickers store local midnight as an ISO string.
      const dateFromStr = format(new Date(data.dateFrom), "yyyy-MM-dd");
      const dateToStr = format(new Date(data.dateTo), "yyyy-MM-dd");

      const statement = apiWritesEnabled("statements")
        ? (
            await statementApi.create({
              customer_id: customerId,
              date_from: dateFromStr,
              date_to: dateToStr,
              notes: data.notes || null,
              include_pdf: includePdf,
            })
          ).statement
        : await createDirect(dateFromStr, dateToStr, data.notes || null);

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

  async function copyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link. Please copy it manually.");
    }
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
                  disabled={isSending || !generatedStatementId || hasSent}
                  onClick={() => {
                    if (isSending || !generatedStatementId || hasSent) return;
                    setIsSending(true);
                    toast.promise(
                      sendStatementEmail(generatedStatementId),
                      {
                        loading: "Sending…",
                        success: (queued) => {
                          setHasSent(true);
                          return queued
                            ? `Statement sent. Emailing it to ${customerName} with the PDF attached…`
                            : "Statement sent by email";
                        },
                        error: () => { setIsSending(false); return "Failed to send email"; },
                      }
                    );
                  }}
                >
                  <Sent02Icon size={13} />
                  {hasSent ? "Sent" : `Send to ${customerName}`}
                </Button>
              </div>
            </div>
            <Separator />
            <div className='flex flex-col gap-2 px-6 py-4'>
              {generatedStatementId && (
                <Button
                  variant='outline'
                  className='w-full gap-1.5'
                  onClick={() => {
                    handleOpenChange(false);
                    navigate(`/statements/${generatedStatementId}`);
                  }}
                >
                  View statement
                  <ArrowRight01Icon size={13} />
                </Button>
              )}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => {
                    form.reset();
                    setGeneratedLink(null);
                    setGeneratedStatementId(null);
                    setIsSending(false);
                    setHasSent(false);
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

              <Field orientation='horizontal' className='items-center justify-between'>
                <div className='flex flex-col gap-0.5'>
                  <FieldLabel htmlFor='statement-include-pdf' className='text-xs font-medium'>
                    Attach PDF
                  </FieldLabel>
                  <FieldDescription>
                    Attach a PDF copy of the statement to the email sent to
                    the customer.
                  </FieldDescription>
                </div>
                <Switch
                  id='statement-include-pdf'
                  checked={includePdf}
                  onCheckedChange={setIncludePdf}
                />
              </Field>

              <div className='rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed'>
                A unique shareable link will be generated. The statement
                captures a snapshot of sent invoices issued in the selected
                period, an opening balance carried from before it, and
                payments received — you can resend the link at any time.
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
