import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"

import { Button, buttonVariants } from "@travada-books/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@travada-books/ui/components/field"
import { Input } from "@travada-books/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@travada-books/ui/components/select"
import { Textarea } from "@travada-books/ui/components/textarea"
import {
  Alert02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  Download01Icon,
  Image01Icon,
  PlusSignIcon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { ARROW_NUDGE } from "~/components/home/shared"
import { ClassicPreview } from "~/components/invoice-generator/classic-preview"
import { FEEDBACK_IN, FieldMessage, INPUT } from "~/components/site/form"
import { captureEvent } from "~/lib/analytics"
import {
  BLANK_DRAFT,
  clearStoredDraft,
  CURRENCIES,
  TAX_ID_LABELS,
  defaultDraft,
  downloadInvoicePdf,
  itemFieldId,
  newItem,
  readLogoFile,
  readStoredDraft,
  storeDraft,
  toDocumentData,
  totalBucket,
  validateDraft,
  type Draft,
  type DraftItem,
} from "~/lib/invoice-generator"

// Module-level: these are per page load, not per mount.
let startedCaptured = false
let restoredDraft = false
let downloadCount = 0

function captureStarted() {
  if (startedCaptured) return
  startedCaptured = true
  captureEvent("invoice_generator_started", { restored_draft: restoredDraft })
}

const SAVE_DELAY_MS = 300

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  optional?: boolean
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: "decimal"
  min?: number
  maxLength?: number
}

function TextField({ id, label, value, onChange, error, hint, optional, ...input }: FieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-ink-subtle">(optional)</span> : null}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldMessage id={id} message={error} />
    </Field>
  )
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  )
}

function LogoField({
  logo,
  error,
  onFile,
  onRemove,
}: {
  logo: string | null
  error?: string
  onFile: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  if (logo) {
    return (
      <Field>
        <span className="text-sm font-medium">Logo</span>
        <div className="flex items-center gap-3 border border-line px-3 py-2">
          <img src={logo} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
          <span className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={onRemove}
            className="grid size-7 shrink-0 place-items-center text-ink-subtle transition-colors fine-hover:text-ink active:opacity-80"
            aria-label="Remove logo"
          >
            <Cancel01Icon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </Field>
    )
  }
  return (
    <Field>
      <span className="text-sm font-medium">
        Logo <span className="font-normal text-ink-subtle">(optional)</span>
      </span>
      <label
        htmlFor="generator-logo"
        className="flex cursor-pointer items-center gap-3 border border-dashed border-line-strong bg-canvas px-4 py-4 transition-colors fine-hover:border-ink-subtle focus-within:border-ring"
      >
        <Image01Icon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Add your logo</span> · PNG or JPG, up to 1 MB
        </span>
        <input
          id="generator-logo"
          type="file"
          accept="image/png,image/jpeg"
          onChange={onFile}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "generator-logo-error" : undefined}
        />
      </label>
      <FieldMessage id="generator-logo" message={error} />
    </Field>
  )
}

function ItemRow({
  item,
  error,
  removable,
  onChange,
  onRemove,
}: {
  item: DraftItem
  error?: string
  removable: boolean
  onChange: (patch: Partial<DraftItem>) => void
  onRemove: () => void
}) {
  const id = itemFieldId(item.id)
  return (
    <li className="grid gap-3 border-b border-line pb-5">
      <TextField
        id={id}
        label="Description"
        value={item.description}
        onChange={(description) => onChange({ description })}
        error={error}
        placeholder="Website design"
        maxLength={500}
      />
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
        <TextField
          id={`generator-item-${item.id}-quantity`}
          label="Qty"
          type="number"
          min={0}
          inputMode="decimal"
          value={item.quantity}
          onChange={(quantity) => onChange({ quantity })}
        />
        <TextField
          id={`generator-item-${item.id}-price`}
          label="Price"
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="0.00"
          value={item.price}
          onChange={(price) => onChange({ price })}
        />
        <TextField
          id={`generator-item-${item.id}-tax`}
          label="Tax %"
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="0"
          value={item.taxRate}
          onChange={(taxRate) => onChange({ taxRate })}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!removable}
          className="grid size-9 place-items-center text-ink-subtle transition-colors fine-hover:text-ink active:opacity-80 disabled:pointer-events-none disabled:opacity-30"
          aria-label="Remove this line"
        >
          <Delete01Icon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export function InvoiceGenerator() {
  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT)
  const [dirty, setDirty] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [logoError, setLogoError] = useState<string>()
  const [downloading, setDownloading] = useState(false)
  const [renderFailed, setRenderFailed] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Dates and any saved draft load after hydration, so the prerendered HTML
  // matches the first client render.
  useEffect(() => {
    const stored = readStoredDraft()
    restoredDraft = stored !== null
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the client's clock and storage, unavailable to the prerender
    setDraft(stored ?? defaultDraft())
    setDirty(stored !== null)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => storeDraft(draft), SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [draft, dirty])

  // Errors are derived once a download has been tried, so each one clears as
  // soon as its field is fixed.
  const errors = attempted ? validateDraft(draft) : {}
  const data = toDocumentData(draft)

  function edit(change: (current: Draft) => Draft) {
    captureStarted()
    setDirty(true)
    setDraft(change)
  }

  const setBusiness = (key: keyof Omit<Draft["business"], "logo">) => (value: string) =>
    edit((d) => ({ ...d, business: { ...d.business, [key]: value } }))
  const setCustomer = (key: keyof Draft["customer"]) => (value: string) =>
    edit((d) => ({ ...d, customer: { ...d.customer, [key]: value } }))
  const setField = (key: "number" | "issueDate" | "dueDate" | "currency" | "discount" | "note" | "paymentDetails") => (value: string) =>
    edit((d) => ({ ...d, [key]: value }))

  async function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    try {
      const logo = await readLogoFile(file)
      setLogoError(undefined)
      edit((d) => ({ ...d, business: { ...d.business, logo } }))
      captureEvent("invoice_generator_logo_added")
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "We couldn't read that file.")
    }
    input.value = ""
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearStoredDraft()
    setDraft(defaultDraft())
    setDirty(false)
    setAttempted(false)
    setLogoError(undefined)
    setRenderFailed(false)
    setDownloaded(false)
    setConfirmClear(false)
    captureEvent("invoice_generator_draft_cleared")
  }

  async function handleDownload() {
    if (downloading) return
    setAttempted(true)
    setRenderFailed(false)

    const firstError = Object.keys(validateDraft(draft))[0]
    if (firstError) {
      setDownloaded(false)
      captureEvent("invoice_generator_download_failed", { error_kind: "validation" })
      document.getElementById(firstError)?.focus()
      return
    }

    setDownloading(true)
    try {
      await downloadInvoicePdf(data)
      downloadCount += 1
      setDownloaded(true)
      // Bucketed and flags only: nothing typed into the invoice goes in here.
      captureEvent("invoice_generator_downloaded", {
        currency: data.currency,
        line_item_count: data.lineItems.length,
        has_logo: Boolean(data.from.logo_url),
        has_tax: (data.taxAmount ?? 0) > 0,
        has_discount: (data.discount ?? 0) > 0,
        has_note: Boolean(data.note),
        has_payment_details: Boolean(data.paymentDetails),
        download_count_this_session: downloadCount,
        total_bucket: totalBucket(data.total ?? 0),
      })
    } catch (err) {
      console.error("invoice generator: PDF failed:", err)
      setDownloaded(false)
      setRenderFailed(true)
      captureEvent("invoice_generator_download_failed", { error_kind: "render" })
    } finally {
      setDownloading(false)
    }
  }

  return (
    // ph-no-capture keeps what's typed and previewed here out of PostHog
    // autocapture and session replay, which is what makes "nothing leaves
    // your browser" true.
    <div className="ph-no-capture grid lg:grid-cols-2">
      <div className="grid min-w-0 content-start gap-8 border-b border-line px-4 py-8 sm:px-6 md:py-12 lg:border-r lg:border-b-0 lg:px-10">
        <FormGroup title="Your business">
          <TextField
            id="generator-business-name"
            label="Business name"
            value={draft.business.name}
            onChange={setBusiness("name")}
            error={errors["generator-business-name"]}
            autoComplete="organization"
            maxLength={160}
          />
          <LogoField
            logo={draft.business.logo}
            error={logoError}
            onFile={handleLogo}
            onRemove={() => edit((d) => ({ ...d, business: { ...d.business, logo: null } }))}
          />
          <TextField id="generator-business-address" label="Address" optional value={draft.business.address} onChange={setBusiness("address")} autoComplete="address-line1" />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="generator-business-city" label="City" optional value={draft.business.city} onChange={setBusiness("city")} autoComplete="address-level2" />
            <TextField id="generator-business-country" label="Country" optional value={draft.business.country} onChange={setBusiness("country")} autoComplete="country-name" />
            <TextField id="generator-business-phone" label="Phone" optional type="tel" value={draft.business.phone} onChange={setBusiness("phone")} autoComplete="tel" />
            <TextField id="generator-business-email" label="Email" optional type="email" value={draft.business.email} onChange={setBusiness("email")} autoComplete="email" />
          </div>
          <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
            <Field>
              <FieldLabel htmlFor="generator-business-tax-label">Tax number</FieldLabel>
              <Select
                value={draft.business.taxIdLabel}
                onValueChange={(value) => {
                  if (value) setBusiness("taxIdLabel")(value)
                }}
              >
                <SelectTrigger id="generator-business-tax-label" className={cn(INPUT, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_ID_LABELS.map((label) => (
                    <SelectItem key={label} value={label} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TextField
              id="generator-business-tax"
              label={draft.business.taxIdLabel}
              optional
              value={draft.business.taxId}
              onChange={setBusiness("taxId")}
            />
          </div>
        </FormGroup>

        <FormGroup title="Bill to">
          <TextField
            id="generator-customer-name"
            label="Customer name"
            value={draft.customer.name}
            onChange={setCustomer("name")}
            error={errors["generator-customer-name"]}
            autoComplete="off"
            maxLength={160}
          />
          <TextField id="generator-customer-address" label="Address" optional value={draft.customer.address} onChange={setCustomer("address")} autoComplete="off" />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="generator-customer-city" label="City" optional value={draft.customer.city} onChange={setCustomer("city")} autoComplete="off" />
            <TextField id="generator-customer-country" label="Country" optional value={draft.customer.country} onChange={setCustomer("country")} autoComplete="off" />
          </div>
          <TextField id="generator-customer-email" label="Email" optional type="email" value={draft.customer.email} onChange={setCustomer("email")} autoComplete="off" />
        </FormGroup>

        <FormGroup title="Invoice">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="generator-number" label="Invoice number" value={draft.number} onChange={setField("number")} autoComplete="off" maxLength={60} />
            <Field>
              <FieldLabel htmlFor="generator-currency">Currency</FieldLabel>
              <Select
                items={CURRENCIES}
                value={draft.currency}
                onValueChange={(value) => {
                  if (value) setField("currency")(value)
                }}
              >
                <SelectTrigger id="generator-currency" className={cn(INPUT, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-sm">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TextField id="generator-issue-date" label="Issue date" type="date" value={draft.issueDate} onChange={setField("issueDate")} />
            <TextField id="generator-due-date" label="Due date" type="date" value={draft.dueDate} onChange={setField("dueDate")} />
          </div>
        </FormGroup>

        <FormGroup title="Line items">
          <ul className="grid gap-5">
            {draft.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                error={errors[itemFieldId(item.id)]}
                removable={draft.items.length > 1}
                onChange={(patch) =>
                  edit((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) }))
                }
                onRemove={() => edit((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }))}
              />
            ))}
          </ul>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => edit((d) => ({ ...d, items: [...d.items, newItem()] }))}
              className="border-line-strong text-sm"
            >
              <PlusSignIcon aria-hidden="true" /> Add a line
            </Button>
          </div>
          <TextField
            id="generator-discount"
            label="Discount"
            optional
            hint={`An amount in ${draft.currency}, taken off the total.`}
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            value={draft.discount}
            onChange={setField("discount")}
            error={errors["generator-discount"]}
          />
        </FormGroup>

        <FormGroup title="Extras">
          <Field>
            <FieldLabel htmlFor="generator-payment-details">
              Payment details <span className="font-normal text-ink-subtle">(optional)</span>
            </FieldLabel>
            <Textarea
              id="generator-payment-details"
              value={draft.paymentDetails}
              onChange={(event) => setField("paymentDetails")(event.target.value)}
              className={cn(INPUT, "min-h-20")}
              maxLength={1000}
            />
            <FieldDescription>Bank or M-Pesa details, printed on the invoice.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="generator-note">
              Note <span className="font-normal text-ink-subtle">(optional)</span>
            </FieldLabel>
            <Textarea
              id="generator-note"
              value={draft.note}
              onChange={(event) => setField("note")(event.target.value)}
              className={cn(INPUT, "min-h-20")}
              maxLength={1000}
            />
          </Field>
        </FormGroup>
      </div>

      <div className="min-w-0 bg-canvas px-4 py-8 sm:px-6 md:py-12 lg:px-10">
        <div className="grid gap-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={handleDownload}
              aria-busy={downloading || undefined}
              className="text-sm"
            >
              <Download01Icon aria-hidden="true" />
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleClear}
                onBlur={() => setConfirmClear(false)}
                className="text-sm text-ink-muted"
              >
                {confirmClear ? "Clear everything?" : "Clear"}
              </Button>
            ) : null}
          </div>

          {attempted && Object.keys(errors).length ? (
            <p role="alert" className={cn("text-sm text-status-overdue", FEEDBACK_IN)}>
              Fill in the highlighted fields to download.
            </p>
          ) : null}

          {renderFailed ? (
            <div
              role="alert"
              className={cn("flex gap-3 border border-status-overdue/30 bg-status-overdue-soft px-4 py-3", FEEDBACK_IN)}
            >
              <Alert02Icon className="mt-0.5 size-4 shrink-0 text-status-overdue" aria-hidden="true" />
              <p className="text-sm text-pretty text-status-overdue">
                We couldn&rsquo;t create the PDF. Try again, or remove the logo if you added one.
              </p>
            </div>
          ) : null}

          {downloaded ? (
            <div
              role="status"
              className="flex animate-in flex-col items-start gap-4 border border-line bg-panel p-5 duration-300 fade-in-0 slide-in-from-bottom-2 [animation-timing-function:var(--ease-out)]"
            >
              <p className="flex gap-2 text-sm text-pretty">
                <CheckmarkCircle01Icon className="mt-0.5 size-4 shrink-0 text-status-paid" aria-hidden="true" />
                Downloaded. Want to send it, track payment and get reminders?
              </p>
              <AppLink
                to="signup"
                location="invoice_generator"
                onClick={() => captureEvent("invoice_generator_signup_clicked", { location: "after_download" })}
                className={cn(buttonVariants({ variant: "outline" }), "border-line-strong text-sm", ARROW_NUDGE)}
              >
                Start free <ArrowRight01Icon aria-hidden="true" />
              </AppLink>
            </div>
          ) : null}

          <ClassicPreview data={data} />
        </div>
      </div>
    </div>
  )
}
