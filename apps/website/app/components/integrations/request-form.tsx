import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import { Field, FieldLabel } from "@travada-books/ui/components/field"
import { Input } from "@travada-books/ui/components/input"
import { Textarea } from "@travada-books/ui/components/textarea"
import { Alert02Icon, ArrowRight01Icon, CheckmarkCircle01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { ARROW_NUDGE } from "~/components/home/shared"
import { FEEDBACK_IN, FieldMessage, INPUT } from "~/components/site/form"
import { CONTACT_EMAIL } from "~/data/site"
import { captureEvent } from "~/lib/analytics"
import { submitSupportRequest } from "~/lib/support"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_ORDER = ["tool", "message", "name", "email"] as const

// Module-level so remounting after a client-side navigation doesn't count as
// a second start: the event is once per page load.
let startedCaptured = false

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; reference: string; name: string; email: string }
  | { state: "error"; message: string }

function Sent({ status, onReset }: { status: Extract<Status, { state: "sent" }>; onReset: () => void }) {
  // The form that had focus is gone; hand focus to the confirmation.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <div
      role="status"
      className="flex animate-in flex-col items-start border border-line bg-panel p-6 duration-300 fade-in-0 slide-in-from-bottom-2 [animation-timing-function:var(--ease-out)] md:p-8"
    >
      <CheckmarkCircle01Icon
        className="size-6 animate-in text-status-paid delay-75 duration-300 fill-mode-backwards fade-in-0 zoom-in-95 [animation-timing-function:var(--ease-out)]"
        aria-hidden="true"
      />
      <h3 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-medium tracking-tight outline-none">
        Request sent
      </h3>
      <p className="mt-3 max-w-md text-pretty text-ink-muted">
        Thanks, {status.name.split(" ")[0]}. A person will read it and reply to{" "}
        <span className="font-medium text-ink">{status.email}</span>.
      </p>
      <p className="mt-6 font-mono text-xs tracking-wide text-ink-subtle uppercase">Reference {status.reference}</p>
      <Button variant="outline" size="lg" onClick={onReset} className="mt-8 border-line-strong text-sm">
        Request another
      </Button>
    </div>
  )
}

export function IntegrationRequestForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formKey, setFormKey] = useState(0)

  function handleFocus() {
    if (startedCaptured) return
    startedCaptured = true
    captureEvent("integration_request_started")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status.state === "sending") return

    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? "").trim()
    const tool = value("tool")
    const message = value("message")
    const name = value("name")
    const email = value("email")
    const honeypot = String(form.get("website") ?? "")

    // Checked here rather than with native `required`, so a failed attempt
    // can be counted and the messages match the rest of the form's errors.
    const found: Record<string, string> = {}
    if (!tool) found.tool = "Enter the name of the tool."
    if (message.length < 10) found.message = "Tell us a little more (at least 10 characters)."
    if (!name) found.name = "Enter your name."
    if (!EMAIL_RE.test(email)) found.email = "Enter a valid email address."
    if (Object.keys(found).length) {
      setErrors(found)
      setStatus({ state: "idle" })
      captureEvent("integration_request_failed", { error_kind: "validation" })
      const first = FIELD_ORDER.find((key) => found[key])
      if (first) document.getElementById(`request-${first}`)?.focus()
      return
    }

    const body = new FormData()
    body.set("topic", "feature")
    body.set("area", "general")
    body.set("urgency", "low")
    body.set("subject", `Integration request: ${tool}`)
    body.set("message", message)
    body.set("name", name)
    body.set("email", email)
    body.set("website", honeypot)

    setErrors({})
    setStatus({ state: "sending" })
    const result = await submitSupportRequest(body)
    if (result.ok) {
      // The function fakes success for a filled honeypot: not demand data.
      if (!honeypot) {
        captureEvent("integration_request_submitted", { tool_name: tool.toLowerCase(), location: "integrations" })
      }
      setStatus({ state: "sent", reference: result.reference, name, email })
      return
    }
    const { subject: subjectError, ...fields } = result.fields ?? {}
    setErrors(subjectError ? { ...fields, tool: subjectError } : fields)
    setStatus({ state: "error", message: result.error })
    captureEvent("integration_request_failed", { error_kind: result.fields ? "validation" : "server" })
  }

  function reset() {
    setErrors({})
    setStatus({ state: "idle" })
    setFormKey((k) => k + 1)
  }

  if (status.state === "sent") {
    return (
      <div className="ph-no-capture">
        <Sent status={status} onReset={reset} />
      </div>
    )
  }

  const sending = status.state === "sending"
  const invalid = (id: string) =>
    errors[id] ? { "aria-invalid": true, "aria-describedby": `request-${id}-error` } : {}

  return (
    <form
      key={formKey}
      noValidate
      onSubmit={handleSubmit}
      onFocus={handleFocus}
      className="ph-no-capture border border-line bg-panel p-6 md:p-8"
      aria-label="Request an integration"
    >
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset disabled={sending} className="grid gap-5">
        <Field>
          <FieldLabel htmlFor="request-tool">Tool name</FieldLabel>
          <Input id="request-tool" name="tool" placeholder="QuickBooks" maxLength={120} className={INPUT} {...invalid("tool")} />
          <FieldMessage id="request-tool" message={errors.tool} />
        </Field>

        <Field>
          <FieldLabel htmlFor="request-message">What should it do for your business?</FieldLabel>
          <Textarea
            id="request-message"
            name="message"
            maxLength={4000}
            placeholder="Send paid invoices across automatically, so I don't enter them twice."
            className={cn(INPUT, "min-h-28")}
            {...invalid("message")}
          />
          <FieldMessage id="request-message" message={errors.message} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="request-name">Your name</FieldLabel>
            <Input id="request-name" name="name" autoComplete="name" placeholder="Jane Wanjiru" maxLength={120} className={INPUT} {...invalid("name")} />
            <FieldMessage id="request-name" message={errors.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="request-email">Email</FieldLabel>
            <Input
              id="request-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jane@business.com"
              maxLength={254}
              className={INPUT}
              {...invalid("email")}
            />
            <FieldMessage id="request-email" message={errors.email} />
          </Field>
        </div>

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
            A person reads every request. We&rsquo;ll use your details only to reply. See our{" "}
            <Link to="/legal/privacy" className="underline underline-offset-2 fine-hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
          <Button type="submit" size="lg" className={cn("shrink-0 text-sm", ARROW_NUDGE)} aria-busy={sending || undefined}>
            {sending ? "Sending…" : "Send request"}
            {sending ? null : <ArrowRight01Icon aria-hidden="true" />}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
