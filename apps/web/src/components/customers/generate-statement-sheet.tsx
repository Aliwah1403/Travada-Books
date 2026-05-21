import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Separator } from "@travada-books/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@travada-books/ui/components/sheet"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@travada-books/ui/components/field"

const schema = z.object({
  dateFrom: z.string().min(1, "Start date is required."),
  dateTo: z.string().min(1, "End date is required."),
  notes: z.string().optional(),
}).refine((d) => d.dateTo >= d.dateFrom, {
  message: "End date must be after start date.",
  path: ["dateTo"],
})

type FormValues = z.infer<typeof schema>

type GenerateStatementSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerName: string
}

export function GenerateStatementSheet({
  open,
  onOpenChange,
  customerName,
}: GenerateStatementSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dateFrom: "", dateTo: "", notes: "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  function onSubmit(data: FormValues) {
    console.log("Generate statement:", data)
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Generate Statement</SheetTitle>
          <SheetDescription>
            Create an account statement for {customerName} covering a specific period.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
          noValidate
        >
          <div className="flex flex-1 flex-col gap-5 overflow-auto px-6 py-5">
            <Controller
              name="dateFrom"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    From <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    className="text-xs"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="dateTo"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    To <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    className="text-xs"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="notes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Please review and confirm your balance."
                    className="text-xs"
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

            <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
              A unique shareable link will be generated. The statement captures
              a snapshot of all invoices and payments in the selected period and
              is saved permanently — you can resend the link at any time.
            </div>
          </div>

          <Separator />
          <SheetFooter className="flex-row gap-2 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Generate Statement
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
