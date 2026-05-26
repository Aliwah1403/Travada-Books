import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@travada-books/ui/components/accordion";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@travada-books/ui/components/field";
import { updateCustomer } from "@/lib/queries/customers";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Enter a valid email."),
  billToEmail: z
    .string()
    .email("Enter a valid email.")
    .or(z.literal(""))
    .optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  website: z.string().optional(),
  vatNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  mainContact: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type CustomerEditValues = FormValues;

type EditCustomerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: FormValues;
  customerId?: string;
  onUpdated?: () => void;
};

const INDUSTRIES = [
  "Technology",
  "Telecommunications",
  "Design & Creative",
  "Marketing & Advertising",
  "Finance & Accounting",
  "Healthcare",
  "Education",
  "Real Estate",
  "Retail & E-commerce",
  "Manufacturing",
  "Consulting",
  "Media & Entertainment",
  "Logistics & Supply Chain",
  "Non-profit",
  "Other",
];

const BUSINESS_TYPES = [
  "B2B",
  "B2C",
  "SaaS",
  "Marketplace",
  "Agency",
  "Freelancer",
  "Other",
];

const COUNTRIES = [
  { name: "Kenya", code: "KE" },
  { name: "Uganda", code: "UG" },
  { name: "Tanzania", code: "TZ" },
  { name: "Rwanda", code: "RW" },
  { name: "Ethiopia", code: "ET" },
  { name: "Nigeria", code: "NG" },
  { name: "Ghana", code: "GH" },
  { name: "South Africa", code: "ZA" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "Other", code: "" },
];

const COUNTRY_CODE: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.name, c.code])
);

export function EditCustomerSheet({
  open,
  onOpenChange,
  customer,
  customerId,
  onUpdated,
}: EditCustomerSheetProps) {
  const [submitError, setSubmitError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer,
  });

  useEffect(() => {
    if (open) form.reset(customer);
  }, [open, customer, form]);

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  async function onSubmit(data: FormValues) {
    if (!customerId) return;
    setSubmitError("");
    try {
      await updateCustomer(customerId, {
        name: data.name,
        email: data.email || undefined,
        billing_email: data.billToEmail || undefined,
        phone: data.phone || undefined,
        website: data.website || undefined,
        address_line1: data.addressLine1 || undefined,
        address_line2: data.addressLine2 || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        country: data.country || undefined,
        country_code: data.country ? (COUNTRY_CODE[data.country] || undefined) : undefined,
        vat_number: data.vatNumber || undefined,
        industry: data.industry || undefined,
        company_type: data.businessType || undefined,
        preferred_currency: data.currency || undefined,
        main_contact: data.mainContact || undefined,
        note: data.note || undefined,
      });
      handleOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update customer");
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='flex flex-col'>
        <SheetHeader className='px-6 pt-6'>
          <SheetTitle>Edit Customer</SheetTitle>
          <SheetDescription>
            Update the details for {customer.name}.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-1 flex-col overflow-hidden'
          noValidate
        >
          <div className='h-[calc(100vh-180px)] scrollbar-hide overflow-auto'>
            <Accordion
              multiple
              defaultValue={["general", "business", "location"]}
              className='w-full'
            >
              {/* General Info */}
              <AccordionItem value='general' className='px-6'>
                <AccordionTrigger className='py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline'>
                  General Info
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-4 pb-5'>
                    <Controller
                      name='name'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Business Name <span className='text-destructive'>*</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='Acme Ltd'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='email'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Email <span className='text-destructive'>*</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type='email'
                            aria-invalid={fieldState.invalid}
                            placeholder='info@acme.com'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='billToEmail'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Bill To Email
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type='email'
                            aria-invalid={fieldState.invalid}
                            placeholder='billing@acme.com'
                            className='text-xs'
                          />
                          <FieldDescription>
                            Where invoices are sent. Leave blank to use the
                            email above.
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='phone'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type='tel'
                            aria-invalid={fieldState.invalid}
                            placeholder='+254 700 000 000'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='mainContact'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Contact Person
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='Jane Doe'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='note'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Note</FieldLabel>
                          <textarea
                            {...field}
                            id={field.name}
                            rows={3}
                            placeholder='Internal notes about this customer…'
                            className='flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Business Details */}
              <AccordionItem value='business' className='px-6'>
                <AccordionTrigger className='py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline'>
                  Business Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-4 pb-5'>
                    <Controller
                      name='industry'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Industry</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              className='text-xs'
                            >
                              <SelectValue placeholder='Select industry' />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRIES.map((i) => (
                                <SelectItem key={i} value={i} className='text-xs'>
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='businessType'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Business Type
                          </FieldLabel>
                          <Select
                            name={field.name}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              className='text-xs'
                            >
                              <SelectValue placeholder='Select type' />
                            </SelectTrigger>
                            <SelectContent>
                              {BUSINESS_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className='text-xs'>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='website'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Website</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='acme.co.ke'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='vatNumber'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            VAT / KRA PIN
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='P051234567A'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Location */}
              <AccordionItem value='location' className='px-6'>
                <AccordionTrigger className='py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline'>
                  Location
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-4 pb-5'>
                    <Controller
                      name='addressLine1'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Address Line 1</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='123 Kimathi Street'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='addressLine2'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Address Line 2</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='Floor 3, Suite 12'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name='city'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>City</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            placeholder='Nairobi'
                            className='text-xs'
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <div className='grid grid-cols-2 gap-3'>
                      <Controller
                        name='state'
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>State / County</FieldLabel>
                            <Input
                              {...field}
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              placeholder='Nairobi County'
                              className='text-xs'
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                      <Controller
                        name='zip'
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>ZIP / Postal Code</FieldLabel>
                            <Input
                              {...field}
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              placeholder='00100'
                              className='text-xs'
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name='country'
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Country</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              className='text-xs'
                            >
                              <SelectValue placeholder='Select country' />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c.name} value={c.name} className='text-xs'>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator />
          {submitError && (
            <p className="px-6 pt-3 text-xs text-destructive">{submitError}</p>
          )}
          <SheetFooter className='flex-row gap-2 px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              onClick={() => handleOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' className='flex-1' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
