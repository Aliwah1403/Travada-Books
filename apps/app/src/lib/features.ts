// Feature flags for functionality that exists in the schema/UI but isn't
// ready to ship yet. Flip these when the underlying integration lands.

// No payment integration ships yet. Hides the Accept Payments section of the
// invoice settings sheet, the Pay Invoice button + balance line on the public
// invoice page, and any other UI driven by `accept_payments`.
export const PAYMENTS_ENABLED = false

// Direct Gmail sync is paused until Google's CASA security assessment is done.
// Existing connected accounts can still sync/disconnect; no new connections.
export const GMAIL_CONNECT_ENABLED = false
