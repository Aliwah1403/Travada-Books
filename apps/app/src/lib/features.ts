// Feature flags for functionality that exists in the schema/UI but isn't
// ready to ship yet. Flip these when the underlying integration lands.

// Online invoice payments (Paystack, M-Pesa first). Shows the Accept Payments
// section of the invoice settings sheet, the Pay button + balance line on the
// public invoice page, and any other UI driven by `accept_payments`.
export const PAYMENTS_ENABLED = true;

// Serves fake payment data (account, pay options, payment status) so the UI can
// be clicked through without Paystack keys. Flip to false once
// PAYSTACK_SECRET_KEY is set on the edge functions.
export const PAYSTACK_MOCK = false;

// Direct Gmail sync is paused until Google's CASA security assessment is done.
// Existing connected accounts can still sync/disconnect; no new connections.
export const GMAIL_CONNECT_ENABLED = false;
