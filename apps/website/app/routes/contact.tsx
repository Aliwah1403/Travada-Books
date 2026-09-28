import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@travada-books/ui/components/field"
import { Input } from "@travada-books/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@travada-books/ui/components/select"
import { Textarea } from "@travada-books/ui/components/textarea"
import {
  Alert02Icon,
  ArrowRight01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Mail01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { Split } from "~/components/site/split"
import { CONTACT_EMAIL } from "~/data/site"
import { captureEvent } from "~/lib/analytics"
import { pageMeta } from "~/lib/seo"
import { submitSupportRequest } from "~/lib/support"
import { ARROW_NUDGE } from "~/components/home/shared"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Contact Travada Books — Support and Questions",
    description:
      "Get help with Travada Books. Send the team a question, report a problem or suggest a feature, and we'll reply by email.",
    path: "/contact",
  })
}

// The form posts to the `submit-support-request` edge function
// (lib/support.ts), which stores the request and emails the support inbox.
// Option values below must match the function's allow-lists.

type Option = { value: string; label: string }

// COPY: needs Curtis's approval (all three option lists).
const TOPICS: Option[] = [
  { value: "help", label: "Help using Travada Books" },
  { value: "bug", label: "Report a problem" },
  { value: "account", label: "Account and sign-in" },
  { value: "import", label: "Imports and data" },
  { value: "billing", label: "Billing and plans" },
  { value: "feature", label: "Feature request" },
  { value: "privacy", label: "Privacy or data request" },
  { value: "partnership", label: "Partnerships and press" },
  { value: "other", label: "Something else" },
]

const AREAS: Option[] = [
  { value: "invoicing", label: "Invoicing" },
  { value: "quotes", label: "Quotes" },
  { value: "customers", label: "Customers and portal" },
  { value: "transactions", label: "Statements and transactions" },
  { value: "inbox", label: "Inbox and receipts" },
  { value: "payments", label: "Payments" },
  { value: "workspace", label: "Account and workspace" },
  { value: "general", label: "Not sure / general" },
]

const URGENCY: Option[] = [
  { value: "low", label: "Low: a question, no rush" },
  { value: "normal", label: "Normal: something isn't working right" },
  { value: "high", label: "High: it's blocking my work" },
  { value: "urgent", label: "Urgent: I can't send invoices or sign in" },
]

const INPUT = "bg-panel text-sm md:text-sm"

function SelectField({
  id,
  label,
  placeholder,
  options,
  error,
}: {
  id: string
  label: string
  placeholder: string
  options: Option[]
  error?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={id} items={options}>
        <SelectTrigger
          id={id}
          className={cn(INPUT, "w-full")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldMessage id={id} message={error} />
    </Field>
  )
}

const MAX_FILES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"]

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Form feedback (field errors, the error banner, attached-file rows) eases
// in on mount so it doesn't jolt the layout; removal stays instant. The
// global reduced-motion rule collapses it.
const FEEDBACK_IN = "animate-in fade-in-0 slide-in-from-top-1 duration-150 [animation-timing-function:var(--ease-out)]"

function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={`${id}-error`} className={cn("text-xs text-status-overdue", FEEDBACK_IN)}>
      {message}
    </p>
  )
}

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; reference: string; name: string; email: string }
  | { state: "error"; message: string }

function Sent({ status, onReset }: { status: Extract<Status, { state: "sent" }>; onReset: () => void }) {
  // The form that had focus is gone; hand focus to the confirmation.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  // Rare, one-off success moment: the panel settles in (the repo's
  // empty-state entrance) and the check follows a beat later. No bounce.
  return (
    <div
      role="status"
      className="flex animate-in flex-col items-start border border-line bg-panel p-6 duration-300 fade-in-0 slide-in-from-bottom-2 [animation-timing-function:var(--ease-out)] md:p-8"
    >
      <CheckmarkCircle01Icon
        className="size-6 animate-in text-status-paid delay-75 duration-300 fill-mode-backwards fade-in-0 zoom-in-95 [animation-timing-function:var(--ease-out)]"
        aria-hidden="true"
      />
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-medium tracking-tight outline-none">
        Message sent
      </h2>
      <p className="mt-3 max-w-md text-pretty text-ink-muted">
        Thanks, {status.name.split(" ")[0]}. We've got your message and will reply to{" "}
        <span className="font-medium text-ink">{status.email}</span>.
      </p>
      <p className="mt-6 font-mono text-xs tracking-wide text-ink-subtle uppercase">Reference {status.reference}</p>
      <Button variant="outline" size="lg" onClick={onReset} className="mt-8 border-line-strong text-sm">
        Send another message
      </Button>
    </div>
  )
}

function ContactForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ state: "idle" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<File[]>([])
  // Bumped on reset so the uncontrolled Base UI selects remount empty.
  const [formKey, setFormKey] = useState(0)

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = [...files]
    let problem = ""
    for (const file of Array.from(list)) {
      if (!ACCEPTED.includes(file.type)) problem = "Attachments must be PNG, JPG or PDF."
      else if (file.size > MAX_FILE_BYTES) problem = "Each file must be 10 MB or smaller."
      else if (next.length >= MAX_FILES) problem = `Attach up to ${MAX_FILES} files.`
      else if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file)
    }
    setFiles(next)
    setErrors((prev) => {
      const next = { ...prev }
      if (problem) next.attachments = problem
      else delete next.attachments
      return next
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status.state === "sending") return
    const body = new FormData(event.currentTarget)
    body.delete("attachments")
    for (const file of files) body.append("attachments", file)

    // The native `required` attribute covers the text inputs; the Base UI
    // select isn't a native control, so check it here.
    if (!body.get("topic")) {
      setErrors({ topic: "Choose a topic." })
      document.getElementById("topic")?.focus()
      return
    }

    setErrors({})
    setStatus({ state: "sending" })
    const result = await submitSupportRequest(body)
    if (result.ok) {
      captureEvent("contact_form_submitted", { topic: body.get("topic"), urgency: body.get("urgency") || null })
      setStatus({
        state: "sent",
        reference: result.reference,
        name: String(body.get("name") ?? ""),
        email: String(body.get("email") ?? ""),
      })
      return
    }
    setErrors(result.fields ?? {})
    setStatus({ state: "error", message: result.error })
  }

  function reset() {
    setFiles([])
    setErrors({})
    setStatus({ state: "idle" })
    setFormKey((k) => k + 1)
  }

  if (status.state === "sent") return <Sent status={status} onReset={reset} />

  const sending = status.state === "sending"
  const invalid = (id: string) => (errors[id] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {})

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="border border-line bg-panel p-6 md:p-8"
      aria-label="Contact support"
    >
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset disabled={sending} className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input id="name" name="name" autoComplete="name" placeholder="Jane Wanjiru" required maxLength={120} className={INPUT} {...invalid("name")} />
            <FieldMessage id="name" message={errors.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jane@business.com"
              required
              maxLength={254}
              className={INPUT}
              {...invalid("email")}
            />
            <FieldMessage id="email" message={errors.email} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="business">
            Business name <span className="font-normal text-ink-subtle">(optional)</span>
          </FieldLabel>
          <Input id="business" name="business" autoComplete="organization" placeholder="Wanjiru Studio" maxLength={160} className={INPUT} />
          <FieldDescription>If you already use Travada Books, this helps us find your workspace.</FieldDescription>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField id="topic" label="What's it about?" placeholder="Choose a topic" options={TOPICS} error={errors.topic} />
          <SelectField id="area" label="Part of the product" placeholder="Choose an area" options={AREAS} error={errors.area} />
        </div>

        <SelectField id="urgency" label="How urgent is it?" placeholder="Choose urgency" options={URGENCY} error={errors.urgency} />

        <Field>
          <FieldLabel htmlFor="subject">Subject</FieldLabel>
          <Input id="subject" name="subject" placeholder="A short summary" required maxLength={200} className={INPUT} {...invalid("subject")} />
          <FieldMessage id="subject" message={errors.subject} />
        </Field>

        <Field>
          <FieldLabel htmlFor="message">Message</FieldLabel>
          <Textarea
            id="message"
            name="message"
            required
            minLength={10}
            maxLength={10000}
            placeholder="Tell us what happened and what you expected. If something went wrong, include the invoice number or the steps that led to it."
            className={cn(INPUT, "min-h-36")}
            {...invalid("message")}
          />
          <FieldMessage id="message" message={errors.message} />
        </Field>

        <Field>
          <span className="text-sm font-medium">
            Attachments <span className="font-normal text-ink-subtle">(optional)</span>
          </span>
          <label
            htmlFor="attachments"
            className={cn(
              "flex cursor-pointer items-center gap-3 border border-dashed border-line-strong bg-canvas px-4 py-4 transition-colors fine-hover:border-ink-subtle focus-within:border-ring",
              files.length >= MAX_FILES && "pointer-events-none opacity-50",
            )}
          >
            <Attachment01Icon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="text-sm text-ink-muted">
              <span className="font-medium text-ink">Add screenshots or files</span> · PNG, JPG or PDF, up to 10 MB each
            </span>
            <input
              ref={fileInputRef}
              id="attachments"
              name="attachments"
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
              {...invalid("attachments")}
            />
          </label>
          {files.length ? (
            <ul className="divide-y divide-line border border-line">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className={cn("flex items-center gap-3 px-3 py-2", FEEDBACK_IN)}>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-subtle">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((f) => f !== file))}
                    className="grid size-7 shrink-0 place-items-center text-ink-subtle transition-colors fine-hover:text-ink active:opacity-80"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Cancel01Icon className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <FieldMessage id="attachments" message={errors.attachments} />
        </Field>

        {status.state === "error" ? (
          <div
            role="alert"
            className={cn("flex gap-3 border border-status-overdue/30 bg-status-overdue-soft px-4 py-3", FEEDBACK_IN)}
          >
            <Alert02Icon className="mt-0.5 size-4 shrink-0 text-status-overdue" aria-hidden="true" />
            <p className="text-sm text-pretty text-status-overdue">
              {status.message}
              {Object.keys(errors).length ? null : (
                <>
                  {" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-2">
                    {CONTACT_EMAIL}
                  </a>
                </>
              )}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-pretty text-ink-subtle">
            We'll use your details only to reply. See our{" "}
            <Link to="/legal/privacy" className="underline underline-offset-2 fine-hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
          <Button type="submit" size="lg" className={cn("text-sm", ARROW_NUDGE)} aria-busy={sending || undefined}>
            {sending ? "Sending…" : "Send message"}
            {sending ? null : <ArrowRight01Icon aria-hidden="true" />}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}

function Detail({ icon: DetailIcon, title, children }: { icon: Icon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 border-t border-line py-5">
      <DetailIcon className="mt-0.5 size-4 shrink-0 text-brand-line" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="mt-1 text-sm text-pretty text-ink-muted">{children}</div>
      </div>
    </li>
  )
}

export default function Contact() {
  return (
    <Section flush>
      <Split
        // Stacks until lg so the form keeps a usable width on tablets.
        className="md:grid-cols-1 lg:grid-cols-[5fr_7fr]"
        startClassName="md:border-r-0 md:border-b lg:border-r lg:border-b-0"
        endClassName="bg-canvas"
        start={
          <div className="flex flex-col">
            <Eyebrow icon={Mail01Icon}>Contact</Eyebrow>
            <h1 className="mt-6 text-4xl font-medium tracking-tight text-balance md:text-5xl">How can we help?</h1>
            {/* COPY: needs Curtis's approval (lede + the three details). */}
            <p className="mt-5 max-w-md text-lg text-pretty text-ink-muted">
              Questions, problems or ideas. Send us a message and someone on the team will reply by email.
            </p>

            <ul className="mt-10 border-b border-line">
              <Detail icon={Clock01Icon} title="A real reply">
                We read every message and aim to reply within one business day.
              </Detail>
              <Detail icon={ArrowRight01Icon} title="Quick answers">
                Many questions are already answered in the{" "}
                <Link to="/guides" className="font-medium text-ink underline underline-offset-2">
                  help centre
                </Link>
                .
              </Detail>
              <Detail icon={Mail01Icon} title="Prefer email?">
                Write to us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                .
              </Detail>
            </ul>
          </div>
        }
        end={<ContactForm />}
      />
    </Section>
  )
}
