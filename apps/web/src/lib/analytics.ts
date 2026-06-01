import posthog from "posthog-js"

export const LogEvents = {
  SignIn:           { event: "user_signed_in",     channel: "auth" },
  SignOut:          { event: "user_signed_out",     channel: "auth" },
  Registered:       { event: "user_registered",    channel: "auth" },
  InvoiceCreated:   { event: "invoice_created",    channel: "invoice" },
  InvoiceSent:      { event: "invoice_sent",       channel: "invoice" },
  InvoiceDeleted:   { event: "invoice_deleted",    channel: "invoice" },
  QuoteCreated:     { event: "quote_created",      channel: "quote" },
  QuoteSent:        { event: "quote_sent",         channel: "quote" },
  QuoteDeleted:     { event: "quote_deleted",      channel: "quote" },
  CustomerCreated:  { event: "customer_created",   channel: "customer" },
  CustomerDeleted:  { event: "customer_deleted",   channel: "customer" },
  StatementCreated: { event: "statement_created",  channel: "statement" },
  SettingsUpdated:  { event: "settings_updated",   channel: "settings" },
} as const

type LogEvent = (typeof LogEvents)[keyof typeof LogEvents]

export function trackEvent(event: LogEvent, properties?: Record<string, unknown>) {
  posthog.capture(event.event, { channel: event.channel, ...properties })
}
