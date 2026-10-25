import React from "npm:react"
import { Text } from "../email-components.ts"
import { EmailLayout, CtaButton, colors, formatMoney } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export interface BillingLine {
  clerkOrgId: string
  customerName?: string | null
  invoiceNumber?: string | null
  // The worker sends a decimal string ("1770.00").
  total?: string | number | null
  currency?: string | null
}

export interface BillingIssue {
  clerkOrgId: string
  customerName?: string | null
  reason: string
}

interface Props {
  periodLabel: string
  drafted: BillingLine[]
  alreadyBilled: BillingLine[]
  skipped: BillingIssue[]
  errors: BillingIssue[]
  viewUrl: string
}

const REASONS: Record<string, string> = {
  not_linked: "No Books customer is linked to this Systems org",
  archived: "The linked Books customer is archived",
  no_fx_rate: "No exchange rate was available for the invoice currency",
  paused: "Billing is paused for this client",
  invalid_settings: "The client's billing settings are invalid",
  no_vehicles: "No billable vehicles this period",
}

export function reasonText(reason: string): string {
  return REASONS[reason] ?? reason
}

/** Shared by the email heading and its subject line, so errors are never reported as "nothing to review". */
export function billingRunTitle(draftedCount: number, errorCount: number): string {
  const errorsText = `${errorCount} error${errorCount === 1 ? "" : "s"} need${errorCount === 1 ? "s" : ""} attention`
  if (draftedCount > 0) {
    const ready = `${draftedCount} Systems invoice${draftedCount === 1 ? "" : "s"} ready to review`
    return errorCount > 0 ? `${ready}, ${errorsText}` : ready
  }
  return errorCount > 0 ? `Systems billing run: ${errorsText}` : "Systems billing run: nothing to review"
}

const h2 = { margin: "32px 0 12px", fontSize: 15, fontWeight: 600, color: colors.dark, fontFamily: font } as const
const rowStyle = { margin: "0 0 8px", fontSize: 13, color: colors.body, lineHeight: "1.5", fontFamily: font } as const

function label(l: { customerName?: string | null; clerkOrgId: string }) {
  return l.customerName || l.clerkOrgId
}

function money(l: BillingLine) {
  const amount = l.total == null || l.total === "" ? NaN : Number(l.total)
  return Number.isFinite(amount) && l.currency ? formatMoney(amount, l.currency) : ""
}

function InvoiceRows({ items }: { items: BillingLine[] }) {
  return (
    <>
      {items.map((l) => (
        <Text key={`${l.clerkOrgId}-${l.invoiceNumber ?? ""}`} style={rowStyle}>
          <strong style={{ color: colors.dark }}>{label(l)}</strong>
          {l.invoiceNumber ? ` · ${l.invoiceNumber}` : ""}
          {money(l) ? ` · ${money(l)}` : ""}
        </Text>
      ))}
    </>
  )
}

function IssueRows({ items }: { items: BillingIssue[] }) {
  return (
    <>
      {items.map((l) => (
        <Text key={`${l.clerkOrgId}-${l.reason}`} style={rowStyle}>
          <strong style={{ color: colors.dark }}>{label(l)}</strong> — {reasonText(l.reason)}
        </Text>
      ))}
    </>
  )
}

export function SystemsBillingDraftsEmail({ periodLabel, drafted, alreadyBilled, skipped, errors, viewUrl }: Props) {
  const title = billingRunTitle(drafted.length, errors.length)

  return (
    <EmailLayout preview={`${title} — ${periodLabel}`} orgName="Travada Books">
      <Text style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        {title}
      </Text>
      <Text style={{ margin: "0 0 24px", fontSize: 14, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {periodLabel}
      </Text>

      {drafted.length > 0 && (
        <>
          <Text style={h2}>Drafts created</Text>
          <InvoiceRows items={drafted} />
        </>
      )}
      {alreadyBilled.length > 0 && (
        <>
          <Text style={h2}>Already billed for this period</Text>
          <InvoiceRows items={alreadyBilled} />
        </>
      )}
      {skipped.length > 0 && (
        <>
          <Text style={h2}>Skipped</Text>
          <IssueRows items={skipped} />
        </>
      )}
      {errors.length > 0 && (
        <>
          <Text style={h2}>Errors</Text>
          <IssueRows items={errors} />
        </>
      )}

      <CtaButton href={viewUrl}>Review drafts</CtaButton>
    </EmailLayout>
  )
}
