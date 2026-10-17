import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@travada-books/ui/components/sheet"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Spokes } from "@travada-books/ui/components/spokes"
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CreditCardIcon,
  MpesaIcon,
} from "@travada-books/ui/icons"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatCurrency } from "@/lib/format"
import { PAYSTACK_MOCK } from "@/lib/features"
import {
  PaymentError,
  checkInvoicePayment,
  startInvoicePayment,
  type InvoicePayOptions,
} from "@/lib/queries/payment-accounts"

type Step = "form" | "starting" | "popup" | "confirming" | "succeeded" | "failed" | "pending"

// Paystack asks for the M-Pesa PIN on the payer's phone for up to 180 s, so poll
// for about a minute here and fall back to "Still processing" after that.
const POLL_INTERVAL_MS = PAYSTACK_MOCK ? 1000 : 3000
const POLL_TIMEOUT_MS = 60_000

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PayInvoiceSheet({
  open,
  onOpenChange,
  token,
  invoiceNumber,
  options,
  defaultEmail,
  initialReference,
  onPaid,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  invoiceNumber: string | null
  options: InvoicePayOptions | null
  defaultEmail: string
  // Set when the payer lands back on the invoice from Paystack's redirect flow.
  initialReference?: string | null
  // Fired as soon as the payment is confirmed — refreshes the invoice and pay options.
  onPaid: () => void
}) {
  const isMobile = useIsMobile()
  const [step, setStep] = useState<Step>(initialReference ? "confirming" : "form")
  const [reference, setReference] = useState<string | null>(initialReference ?? null)
  const [email, setEmail] = useState(defaultEmail)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)
  const [paid, setPaid] = useState<{ amount: number; currency: string } | null>(null)

  // Confirming: poll the status function until it resolves or we time out.
  useEffect(() => {
    if (step !== "confirming" || !reference) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = Date.now() + POLL_TIMEOUT_MS

    async function tick() {
      try {
        const result = await checkInvoicePayment(token, reference!)
        if (cancelled) return
        if (result.status === "succeeded") {
          setStep("succeeded")
          onPaid()
          return
        }
        if (result.status === "failed") {
          setFailureMessage(result.message ?? null)
          setStep("failed")
          return
        }
      } catch {
        // transient — keep polling until the deadline
      }
      if (cancelled) return
      if (Date.now() >= deadline) {
        setStep("pending")
        return
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // onPaid is intentionally not a dependency: it only invalidates queries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reference, token])

  const balance = options?.balance ?? 0
  const currency = options?.currency ?? "KES"
  const amountLabel = formatCurrency(balance, currency)
  const showCards = !!options?.cards

  async function handlePay() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Enter a valid email address.")
      return
    }
    setEmailError(null)
    setFormError(null)
    setStep("starting")

    let started
    try {
      started = await startInvoicePayment(token, email.trim())
    } catch (e) {
      // Paystack rejected the email itself — point at the field, not a retry.
      if (e instanceof PaymentError && e.code === "email") {
        setEmailError(e.message)
        setStep("form")
        return
      }
      setFormError(
        e instanceof PaymentError || e instanceof Error ?
          e.message
        : "Something went wrong. Please try again.",
      )
      setStep("form")
      return
    }

    setReference(started.reference)
    setPaid({ amount: started.amount, currency: started.currency })

    // Mock mode skips the Paystack popup; checkInvoicePayment simulates the PIN wait.
    if (PAYSTACK_MOCK) {
      setStep("confirming")
      return
    }

    // The popup is an iframe over the page; the sheet's focus trap would fight it,
    // so the sheet hides while it is open and comes back on success or cancel.
    setStep("popup")
    const redirect = () => {
      window.location.href = started.authorizationUrl
    }
    try {
      const { default: PaystackPop } = await import("@paystack/inline-js")
      new PaystackPop().resumeTransaction(started.accessCode, {
        onSuccess: () => setStep("confirming"),
        onCancel: () => setStep("form"),
        onError: redirect,
      })
    } catch {
      redirect()
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    // Leaving a finished attempt behind: next open starts a fresh form. An
    // in-flight "confirming" keeps its state so reopening shows the result.
    if (!next && (step === "succeeded" || step === "failed" || step === "pending")) {
      setStep("form")
      setReference(null)
      setFailureMessage(null)
    }
  }

  const busy = step === "starting"

  return (
    <Sheet open={open && step !== "popup"} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]"
      >
        {step === "form" || step === "starting" ?
          <>
            <SheetHeader>
              <SheetTitle>Pay invoice {invoiceNumber}</SheetTitle>
              <SheetDescription>to {options?.business_name ?? "this business"}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-6 pb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Amount due</p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight">{amountLabel}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="pay-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  disabled={busy}
                  className={emailError ? "border-destructive text-xs" : "text-xs"}
                />
                {emailError ?
                  <p className="text-[11px] text-destructive">{emailError}</p>
                : <p className="text-[11px] text-muted-foreground">Paystack sends your receipt here.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs">Pay with</p>
                <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
                  <MpesaIcon size={20} />
                  M-Pesa
                </div>
                {showCards && (
                  <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
                    <CreditCardIcon size={18} className="text-muted-foreground" />
                    Card
                  </div>
                )}
              </div>

              {formError && <p className="text-xs text-destructive">{formError}</p>}
            </div>

            <SheetFooter>
              <Button onClick={handlePay} disabled={busy} className="w-full">
                {busy ? "Starting…" : `Pay ${amountLabel}`}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Payments are processed securely by Paystack.
              </p>
            </SheetFooter>
          </>
        : step === "confirming" ?
          <StatusView
            icon={<Spokes className="size-8 text-primary" />}
            title="Confirming your payment…"
            body="This can take up to a minute for M-Pesa."
          />
        : step === "succeeded" ?
          <StatusView
            icon={
              <CheckmarkCircle02Icon
                size={36}
                className="animate-in fade-in-0 text-green-600 duration-200 [animation-timing-function:var(--ease-out)] dark:text-green-400"
              />
            }
            title="Payment received"
            body={
              <>
                {paid && (
                  <span className="mb-1 block text-base font-semibold text-foreground">
                    {formatCurrency(paid.amount, paid.currency)}
                  </span>
                )}
                {email ? `A receipt is on its way to ${email}.` : "A receipt is on its way to your email."}
              </>
            }
            action={
              <Button className="w-full" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            }
          />
        : step === "failed" ?
          <StatusView
            icon={<Alert01Icon size={32} className="text-destructive" />}
            title="Payment didn't go through"
            body={failureMessage ?? "You haven't been charged. You can try again."}
            action={
              <Button className="w-full" onClick={() => setStep("form")}>
                Try again
              </Button>
            }
          />
        : <StatusView
            icon={<Clock01Icon size={32} className="text-muted-foreground" />}
            title="Still processing"
            body="We'll update this invoice as soon as Paystack confirms. You can close this page."
            action={
              <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            }
          />
        }
      </SheetContent>
    </Sheet>
  )
}

function StatusView({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        {icon}
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{body}</p>
      </div>
      {action && <SheetFooter>{action}</SheetFooter>}
    </>
  )
}
