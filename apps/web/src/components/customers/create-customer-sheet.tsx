import { useEffect } from "react";
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
  country: z.string().optional(),
  mainContact: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type CreateCustomerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
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
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Ethiopia",
  "Nigeria",
  "Ghana",
  "South Africa",
  "United Kingdom",
  "United States",
  "Other",
];

export function CreateCustomerSheet({
  open,
  onOpenChange,
  defaultName = "",
}: CreateCustomerSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultName,
      email: "",
      billToEmail: "",
      phone: "",
      industry: "",
      businessType: "",
      website: "",
      vatNumber: "",
      country: "",
      mainContact: "",
    },
  });

  useEffect(() => {
    if (open) form.reset({ name: defaultName });
  }, [open, defaultName, form]);

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function onSubmit(data: FormValues) {
    console.log(data);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='flex flex-col'>
        <SheetHeader className='px-6 pt-6'>
          <SheetTitle>New Customer</SheetTitle>
          <SheetDescription>
            Add a new customer to your account.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-1 flex-col overflow-hidden'
          noValidate
        >
          <div className='h-[calc(100vh-180px)] scrollbar-hide overflow-auto'>
            <Accordion
              type='multiple'
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
                          <FieldDescription>
                            We'll automatically fill in the company details if we can find them based on this email.
                          </FieldDescription>
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
                          <FieldLabel htmlFor={field.name}>Contact Person</FieldLabel>
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
                                <SelectItem
                                  key={i}
                                  value={i}
                                  className='text-xs'
                                >
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
                                <SelectItem
                                  key={t}
                                  value={t}
                                  className='text-xs'
                                >
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
                                <SelectItem
                                  key={c}
                                  value={c}
                                  className='text-xs'
                                >
                                  {c}
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
          <SheetFooter className='flex-row gap-2 px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' className='flex-1'>
              Create Customer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
