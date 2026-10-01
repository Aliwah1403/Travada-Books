// Feature flags for functionality that exists in the schema/UI but isn't
// ready to ship yet. Flip these when the underlying integration lands.

// No payment integration ships yet. Hides the Accept Payments section of the
// invoice settings sheet, the Pay Invoice button + balance line on the public
// invoice page, and any other UI driven by `accept_payments`.
export const PAYMENTS_ENABLED = false
