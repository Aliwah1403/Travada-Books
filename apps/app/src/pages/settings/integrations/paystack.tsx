import { useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@travada-books/ui/components/button"
import { Badge } from "@travada-books/ui/components/badge"
import { Card, CardContent } from "@travada-books/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog"
import { cn } from "@travada-books/ui/lib/utils"
import {
  Alert01Icon,
  ArrowLeft01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  MpesaIcon,
  ReceiptTextIcon,
  SmartPhone01Icon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import { usePaymentAccount } from "@/hooks/use-payment-account"
import {
  PaymentError,
  TIER_LIMITS,
  changePayoutAccount,
  connectPaystack,
  reconnectPaystack,
  type PaymentAccount,
  type PaymentAccountStatus,
  type PayoutAccountInput,
} from "@/lib/queries/payment-accounts"
import { formatCurrency } from "@/lib/format"
import { IntegrationIcon } from "@/components/settings/integration-icon"
import { PayoutAccountForm } from "@/components/settings/payout-account-form"
import { DisconnectPaystackDialog } from "@/components/settings/disconnect-paystack-dialog"

const SUPPORT_EMAIL = "support@travadabooks.com"

// Same {label, icon, className} + Badge shape as AccountStatusBadge in gmail.tsx —
// color-only crossfade (transition-colors), no scale/slide, per CLAUDE.md.
const statusConfig: Record<PaymentAccountStatus, { label: string; icon: Icon; className: string }> = {
  active: {
    label: "Active",
    icon: CheckmarkCircle01Icon,
    className:
      "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  pending_review: {
    label: "Under review",
    icon: Clock01Icon,
    className:
      "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  frozen: {
    label: "Paused",
    icon: Alert01Icon,
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  disabled: {
    label: "Disconnected",
    icon: CancelCircleIcon,
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
}

function AccountStatusBadge({ status }: { status: PaymentAccountStatus }) {
  const { icon: StatusIcon, label, className } = statusConfig[status]
  return (
    <Badge className={cn("border-0 font-medium rounded-md transition-colors duration-200", className)}>
      <StatusIcon size={12} />
      {label}
    </Badge>
  )
}

const howItWorks = [
  {
    icon: SmartPhone01Icon,
    label: "Customers tap Pay on your invoice link and approve with their M-Pesa PIN",
  },
  {
    icon: Wallet01Icon,
    label: "Paystack pays you out within 2 business days, minus their fee (1.5% for M-Pesa)",
  },
  {
    icon: ReceiptTextIcon,
    label: "The invoice is marked paid automatically",
  },
]

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
      <div className="flex items-center gap-4">
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-72 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
    </div>
  )
}

function Banner({ tone, children }: { tone: "amber" | "red" | "muted"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 text-xs",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
        tone === "red" && "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
        tone === "muted" && "bg-muted/50 text-muted-foreground",
      )}
    >
      {children}
    </div>
  )
}

function errorMessage(e: unknown): string {
  return e instanceof PaymentError || e instanceof Error ?
      e.message
    : "Something went wrong. Please try again."
}

function ConnectedView({ account, isOwner, orgName }: { account: PaymentAccount; isOwner: boolean; orgName: string }) {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const [changeOpen, setChangeOpen] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const changeMutation = useMutation({
    mutationFn: (input: PayoutAccountInput) => changePayoutAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-account", orgId] })
      setChangeOpen(false)
      toast.success("Payout account updated")
    },
  })

  const reconnectMutation = useMutation({
    mutationFn: reconnectPaystack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-account", orgId] }),
  })

  function handleReconnect() {
    toast.promise(reconnectMutation.mutateAsync(), {
      loading: "Reconnecting…",
      success: "M-Pesa payments reconnected.",
      error: errorMessage,
    })
  }

  const limits = TIER_LIMITS[account.cards_enabled ? "trusted" : "new"]
  const perPayment = account.per_payment_limit ?? limits.perPayment
  const weekly = account.weekly_limit ?? limits.weekly
  const holdActive = !!account.cards_hold_until && new Date(account.cards_hold_until) > new Date()
  const payoutLabel = account.settlement_label ?? "Payout account"

  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Payout account</h3>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{payoutLabel}</span>
                {account.resolved_account_name && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    Account holder: {account.resolved_account_name}
                  </span>
                )}
              </div>
              <AccountStatusBadge status={account.status} />
            </div>

            {account.status === "pending_review" && (
              <Banner tone="amber">
                We're checking your payout details. Online payments switch on once that's done,
                usually within one business day.
              </Banner>
            )}
            {account.status === "frozen" && (
              <Banner tone="red">
                <p className="font-medium">Online payments are paused.</p>
                {account.frozen_reason && <p className="mt-0.5">{account.frozen_reason}</p>}
                <p className="mt-0.5">
                  Contact{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </Banner>
            )}
            {account.status === "disabled" && (
              <Banner tone="muted">
                <div className="flex items-center justify-between gap-3">
                  <span>Disconnected. Customers can't pay online.</span>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReconnect}
                      disabled={reconnectMutation.isPending}
                    >
                      Reconnect
                    </Button>
                  )}
                </div>
              </Banner>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Payment methods</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
            <div className="flex items-center gap-3">
              <MpesaIcon size={20} />
              <span className="text-sm">M-Pesa</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {account.status === "active" ? "Enabled" : "Off until your account is active"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
            <div className="text-sm">Card</div>
            {account.cards_enabled ?
              <span className="text-right text-xs text-muted-foreground">
                {holdActive ?
                  `Paused until ${format(new Date(account.cards_hold_until!), "d MMM yyyy")} after your payout account changed`
                : "Enabled"}
              </span>
            : <span className="text-xs text-muted-foreground/70">Available once your account is verified</span>}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Limits</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Need higher limits? Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Per payment</p>
            <p className="mt-0.5 text-sm font-medium">{formatCurrency(perPayment, account.currency)}</p>
          </div>
          <div className="rounded-md border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Per 7 days</p>
            <p className="mt-0.5 text-sm font-medium">{formatCurrency(weekly, account.currency)}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Fees</h3>
        <p className="text-xs text-muted-foreground">
          Paystack charges 1.5% on M-Pesa (2.9% on local cards), taken before payout. Travada takes
          nothing.
        </p>
      </section>

      {isOwner && account.status !== "disabled" && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setChangeOpen(true)}>
            Change payout account
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDisconnectOpen(true)}>
            Disconnect
          </Button>
        </div>
      )}

      <Dialog
        open={changeOpen}
        onOpenChange={(open) => {
          setChangeOpen(open)
          if (!open) changeMutation.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change payout account</DialogTitle>
            <DialogDescription>Choose where future payouts should go.</DialogDescription>
          </DialogHeader>
          <PayoutAccountForm
            orgName={orgName}
            submitLabel="Save changes"
            isPending={changeMutation.isPending}
            serverError={changeMutation.error ? errorMessage(changeMutation.error) : null}
            onSubmit={(input) => changeMutation.mutate(input)}
            secondaryAction={
              <Button type="button" size="sm" variant="ghost" onClick={() => setChangeOpen(false)}>
                Cancel
              </Button>
            }
          >
            <Banner tone="amber">
              For your security, card payments pause for 7 days after a change, and we'll email the
              account owner.
            </Banner>
          </PayoutAccountForm>
        </DialogContent>
      </Dialog>

      <DisconnectPaystackDialog open={disconnectOpen} onOpenChange={setDisconnectOpen} />
    </>
  )
}

function ConnectView({ isOwner, orgName }: { isOwner: boolean; orgName: string }) {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  const connectMutation = useMutation({
    mutationFn: (input: PayoutAccountInput) => connectPaystack(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-account", orgId] })
      toast.success("M-Pesa payments connected")
    },
  })

  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">How it works</h3>
        <div className="flex flex-col gap-2">
          {howItWorks.map((step) => (
            <div key={step.label} className="flex items-start gap-3 rounded-md border px-3 py-2.5">
              <step.icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm">{step.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Connect</h3>
        {isOwner ?
          <Card>
            <CardContent>
              <PayoutAccountForm
                orgName={orgName}
                submitLabel="Connect"
                isPending={connectMutation.isPending}
                serverError={connectMutation.error ? errorMessage(connectMutation.error) : null}
                onSubmit={(input) => connectMutation.mutate(input)}
              />
            </CardContent>
          </Card>
        : <Banner tone="muted">Only the account owner can connect payments.</Banner>}
      </section>
    </>
  )
}

export function PaystackIntegrationPage() {
  const { org, orgRole } = useAuth()
  const navigate = useNavigate()
  const { data: account, isLoading } = usePaymentAccount()

  const isOwner = orgRole === "owner"
  const orgName = org?.name ?? "your business"

  if (isLoading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 text-muted-foreground"
        onClick={() => navigate("/settings/integrations")}
      >
        <ArrowLeft01Icon size={16} />
        Back
      </Button>

      <div className="flex items-center gap-4">
        <IntegrationIcon brand="mpesa" icon={MpesaIcon} size={32} />
        <div>
          <h2 className="text-lg font-semibold">M-Pesa payments</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Let customers pay your invoices with M-Pesa. Powered by Paystack.
          </p>
        </div>
      </div>

      {account ?
        <ConnectedView account={account} isOwner={isOwner} orgName={orgName} />
      : <ConnectView isOwner={isOwner} orgName={orgName} />}
    </div>
  )
}
