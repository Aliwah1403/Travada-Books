import posthog from "posthog-js"

export const LogEvents = {
  SignIn:           { event: "user_signed_in",     channel: "auth" },
  SignOut:          { event: "user_signed_out",     channel: "auth" },
  Registered:       { event: "user_registered",    channel: "auth" },
  UserInvited:      { event: "user_invited",       channel: "auth" },
  InvoiceCreated:   { event: "invoice_created",    channel: "invoice" },
  InvoiceSent:      { event: "invoice_sent",       channel: "invoice" },
  InvoiceViewed:    { event: "invoice_viewed",     channel: "invoice" },
  InvoicePaid:      { event: "invoice_paid",       channel: "invoice" },
  InvoiceDeleted:   { event: "invoice_deleted",    channel: "invoice" },
  QuoteCreated:     { event: "quote_created",      channel: "quote" },
  QuoteSent:        { event: "quote_sent",         channel: "quote" },
  QuoteAccepted:    { event: "quote_accepted",     channel: "quote" },
  QuoteRejected:    { event: "quote_rejected",     channel: "quote" },
  QuoteDeleted:     { event: "quote_deleted",      channel: "quote" },
  CustomerCreated:  { event: "customer_created",   channel: "customer" },
  CustomerViewed:   { event: "customer_viewed",    channel: "customer" },
  CustomerEdited:   { event: "customer_edited",    channel: "customer" },
  CustomerDeleted:  { event: "customer_deleted",   channel: "customer" },
  StatementCreated: { event: "statement_created",  channel: "statement" },
  SettingsUpdated:  { event: "settings_updated",   channel: "settings" },
  BillCreated:      { event: "bill_created",       channel: "bill" },
  BillEdited:       { event: "bill_edited",        channel: "bill" },
  BillMarkedPaid:   { event: "bill_marked_paid",   channel: "bill" },
  BillMarkedUnpaid: { event: "bill_marked_unpaid", channel: "bill" },
  BillDeleted:      { event: "bill_deleted",       channel: "bill" },
  BillFileOpened:   { event: "bill_file_opened",   channel: "bill" },
  CategoryRuleCreated: { event: "category_rule_created", channel: "transaction" },
  CategoryRuleDeleted: { event: "category_rule_deleted", channel: "transaction" },
  CategoryRulePromptShown: { event: "category_rule_prompt_shown", channel: "transaction" },
  ReceiptNudgeOpened: { event: "receipt_nudge_opened", channel: "transaction" },
  InsightViewed: { event: "insight_viewed", channel: "insight" },
  InsightActionClicked: { event: "insight_action_clicked", channel: "insight" },
  InsightEmailOpened: { event: "insight_email_opened", channel: "insight" },
} as const

type LogEvent = (typeof LogEvents)[keyof typeof LogEvents]

export function trackEvent(event: LogEvent, properties?: Record<string, unknown>) {
  posthog.capture(event.event, { channel: event.channel, ...properties })
}
