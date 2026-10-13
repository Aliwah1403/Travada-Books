# Invoice Payments Plan — clients pay invoices online (Paystack first)

_Date: 2026-10-13. Status: plan only, nothing built. Implements `CONNECTED-ACCOUNTS-PLAN.md` §7 (multi-provider invoice payments) and narrows its first build to Paystack for Kenya. Bank sync lives in `BANK-SYNC-PLAN.md`; UAE payments via Lean are covered in §9 here only as a later provider._

Goal: a business sends a Travada invoice, the client opens `/i/:token`, taps **Pay**, pays by M-Pesa or card, and the invoice moves to paid / partially paid on its own. The money goes straight to the business; Travada never holds it.

## 1. Why Paystack first

Checked against paystack.com/docs on 2026-10-13.

- **Kenyan payment methods:** M-Pesa STK push, M-Pesa offline (Paystack Paybill + reference), payment from another business's M-Pesa Till, Airtel Money, cards (Visa, Mastercard, Amex), and Pesalink bank transfer (Kenyan-registered businesses, enabled on request).
- **Fees (Kenya):** 1.5% M-Pesa, 2.9% local cards, 3.8% international cards. No setup or monthly fees; volume discounts via kenya@paystack.com.
- **Settlement:** T+2 to a bank account or M-PESA wallet; USD settlement possible to a Kenyan USD account.
- **Licensed locally:** Paystack holds a CBK payment service provider licence and is Stripe-owned. Stripe itself does not onboard Kenyan businesses directly; Kenya is served through Paystack.
- **Free to integrate,** with an instant test mode, and no licensing blocker for Travada (a Kenyan-registered company).
- **Countries:** Kenya, Nigeria, Ghana, South Africa (and Côte d'Ivoire for some products). **Not the UAE**, so UAE businesses need a different provider (§9).

This changes the build order in `CONNECTED-ACCOUNTS-PLAN.md` §7 (which had Direct Daraja → IntaSend → Stripe → Paystack). Paystack now goes first: one integration covers M-Pesa *and* cards, there's no per-org Daraja onboarding, and Stripe is not an option from Kenya.

## 2. The model decision (needs Curtis)

Paystack supports two ways to pay a business. §7 of the connected-accounts plan assumed the first.

| | **A. Business connects its own Paystack account** (§7 model, Midday-style) | **B. Subaccounts under Travada's Paystack account** (split payments) |
|---|---|---|
| Business onboarding | Signs up at Paystack, passes Paystack's KYC (registered business), pastes its secret key into Travada, and adds our webhook URL in its Paystack dashboard | Enters bank account (or M-Pesa, if supported — Q1) in Travada settings. Done in a minute |
| Who Paystack's customer is | The business | Travada; the business is a subaccount |
| Refunds, chargebacks, fraud | The business's account | Likely Travada's main account by default (Q2) |
| Travada can take a cut | No | Yes: `percentage_charge` per subaccount or `transaction_charge` flat fee per payment; `bearer` decides who pays Paystack's fee |
| Secrets we store | Each org's Paystack secret key (encrypted) | Only our own key |
| Webhooks | One URL, but each org's account signs with *its own* secret key, so we look up the org before verifying | One URL, one secret |
| Freelancers without a registered business | Blocked by Paystack's KYC | Possible, if Paystack's terms allow (Q3) |

**Recommendation: B (subaccounts), conditional on Paystack's answers to Q1–Q3.** Onboarding friction is the main reason businesses don't turn on online payments, and B removes it completely. If Paystack makes Travada carry chargeback/fraud liability with no controls, or doesn't allow unregistered subaccounts, fall back to A. The rest of this plan is written so the provider layer supports both: the only difference is how a payment is created and which secret verifies the webhook.

Platform cut: launch at **zero** (§7 decision, Midday model), but keep the `transaction_charge` hook so it can be turned on later.

## 3. Data model

Reuses what partial payments already built. `invoice_payments` already has `source in ('manual','gateway')` and `gateway_reference`; gateway rows are already treated as undeletable.

**New `payment_accounts`** (one row per org per provider). Name follows §7's `invoice_payment_accounts` idea, shortened:

| Column | Notes |
|---|---|
| `id`, `created_at`, `org_id` (fk, cascade) | |
| `provider` | enum `payment_provider`: `paystack` (later `lean`, `stripe`, `intasend`, `daraja`) |
| `mode` | `subaccount` \| `own_account` |
| `external_id` | Paystack `subaccount_code` (mode B) or Paystack integration id (mode A) |
| `secret_key` | encrypted, mode A only; never client-selectable |
| `settlement_label` | display only, e.g. "Equity Bank ••4821" or "M-Pesa ••0722" |
| `currency` | KES / USD |
| `status` | `active` \| `pending_verification` \| `disabled` |
| `last_error` | |

Unique (`org_id`, `provider`). RLS: members SELECT the safe columns (same revoke-then-grant pattern as `inbox_accounts` / `bank_connections`); writes only through edge functions.

**Service-only `payment_attempts`** (one row per checkout started), so webhooks can be traced back without trusting the payload:

| Column | Notes |
|---|---|
| `reference` (pk) | Our reference, sent to Paystack as `reference`, e.g. `inv_<short id>_<n>` |
| `org_id`, `invoice_id`, `payment_account_id` | |
| `amount`, `currency` | What we asked Paystack to charge |
| `status` | `initialized` \| `succeeded` \| `failed` \| `abandoned` |
| `created_at`, `completed_at` | |

**`invoices`:** keep `accept_payments` as the per-invoice switch. The invoice settings sheet's toggle turns on only when the org has an active `payment_accounts` row. A per-invoice provider picker (§7) waits until a second provider exists.

**Webhook idempotency:** a `payment_webhook_events (event_key pk, provider, received_at)` table, same as `bank_webhook_events`. Paystack doesn't send an event id, so the key is `<event>:<data.reference>`.

## 4. Flows

### 4.1 Connect (settings → Integrations → Paystack)

Mode B:
1. The business picks how to get paid: bank account, or M-Pesa wallet / Till / Paybill if Paystack allows it for subaccounts (Q1).
2. Bank list from `GET /bank?country=kenya` (cached); account-name check where Paystack supports it.
3. The `payments-connect-paystack` edge function (owner/admin only) calls `POST /subaccount` with `business_name` = org name, `bank_code`, `account_number`, `percentage_charge: 0`, and primary contact = the caller. It stores `subaccount_code` in `payment_accounts`.
4. Edit and disconnect go through the same function (`PUT /subaccount/:code`, `active: false`).

Mode A (fallback): the business pastes its secret key. We validate it with a cheap call (`GET /bank` or `GET /integration/...`), encrypt and store it, then show the webhook URL to paste into their Paystack dashboard, with a "Send test" check.

### 4.2 Pay (public invoice page)

1. `/i/:token` shows **Pay** when `accept_payments` is on, the org has an active payment account, and the invoice is not draft, paid or canceled, with balance due > 0 (same guards as Midday). The Pay button and balance line already exist behind `PAYMENTS_ENABLED`.
2. Pay opens a right-side sheet (Drawer on mobile), porting Midday's `payment-modal.tsx` shell. It shows the amount due (full balance by default; an editable partial amount is a later option, the ledger already supports it) and the payer's email. Paystack requires an email; prefill it from the invoice snapshot's customer email.
3. The public `invoice-pay-paystack` edge function is token-authorised (no login). It:
   - looks up the invoice by token;
   - re-checks the guards and computes the balance server-side (never trusts the client amount);
   - creates a `payment_attempts` row;
   - calls `POST /transaction/initialize` with `email`, `amount` (minor units), `currency`, `reference`, `subaccount` (mode B), `channels: ["mobile_money","card"]` (plus `"bank_transfer"` once Pesalink is enabled), `callback_url` = `/i/:token?paid=<reference>`, and `metadata { invoice_id, org_id }`;
   - returns the `authorization_url` / `access_code`.
4. The sheet opens Paystack's Popup (`@paystack/inline-js` with the `access_code`), so the payer never leaves the invoice. The redirect to `authorization_url` is the fallback.
5. The payer completes M-Pesa (PIN prompt on their phone) or card.

### 4.3 Confirm (the webhook is the source of truth)

1. `payments-webhook-paystack` (public, `verify_jwt = false`) verifies `x-paystack-signature`: HMAC-SHA512 of the raw body with the secret key (Travada's in mode B; in mode A the org's, resolved via `reference` → `payment_attempts` → `payment_accounts`).
2. Idempotency insert, then handle:
   - `charge.success`: load `payment_attempts` by `data.reference`; check `data.amount`, `data.currency` and `data.status === "success"` match. Then insert into `invoice_payments` with `source 'gateway'`, `method` from `data.channel` (`mobile_money` → `mpesa`, `card` → `card`, `bank_transfer` → `bank_transfer`), `gateway_reference = data.reference`, `paid_at = data.paid_at`, and `amount` = the amount charged (Paystack fees come out of the business's settlement, not the invoice). The existing ledger triggers derive paid / partially paid, and `lib/notify-invoice-paid` fires the paid notification. Mark the attempt `succeeded`.
   - `refund.processed` (later): record a negative adjustment or reopen the balance. Out of scope for v1, logged only.
   - anything else: 200 and log.
3. **Belt and braces:** when the payer returns with `?paid=<reference>`, the public page calls `invoice-payment-status`. That function calls `GET /transaction/verify/:reference` and runs the same insert, idempotent on `gateway_reference`, so a slow webhook doesn't leave the payer staring at "unpaid". A small scheduled task re-verifies `initialized` attempts older than 15 minutes (M-Pesa can be slow; Paystack's docs say verify after 180 s if no webhook arrives).
4. The public page polls the payments-by-token RPC for ~60 s after the sheet closes and shows "Payment received" / "Processing" / "Didn't go through".

### 4.4 Bookkeeping link

A gateway payment creates an `invoice_payments` row with no transaction. When Paystack's settlement later lands in the business's bank and is synced or imported, the existing "match transaction to invoice" flow links it. Settlement is a net batch (several payments minus fees), so v1 does not auto-match it; that's a follow-up (Paystack settlement API → one expected deposit per settlement).

## 5. Security notes

- The public pay endpoint is token-gated only, so rate-limit per token and per IP (same hashed-IP approach as `submit-support-request`). Amounts are always computed server-side.
- The webhook trusts nothing before the signature check, and nothing after it except values cross-checked against `payment_attempts`.
- Mode A secret keys are encrypted with `INTEGRATION_ENCRYPTION_KEY` and never returned to the client.
- Never mark an invoice paid from the redirect query string alone; it must come from a webhook or `transaction/verify`.

## 6. UI

- **Integrations card** "Paystack — M-Pesa & card payments" replaces the M-Pesa "Coming soon" card for Kenyan orgs (the Stripe card stays Coming soon). It shows the settlement label when connected.
- **Settings page** `/settings/integrations/paystack`: connect form (bank or M-Pesa, account name confirmation), status, edit, disconnect, and fee copy ("Paystack charges 1.5% on M-Pesa and 2.9% on cards; deducted before payout").
- **Invoice settings sheet:** un-hide the Accept payments section (`PAYMENTS_ENABLED`) and enable it only when a payment account is active, with a "Connect Paystack" link otherwise.
- **Invoice detail:** gateway payments show in the payments list with a "Paid online · M-Pesa" badge and can't be deleted (existing rule for `source = 'gateway'`).
- **Public invoice page:** Pay button + sheet as in §4.2. Copy: "Pay with M-Pesa or card".
- Animation rules per CLAUDE.md (sheet 200/150 ms `--ease-drawer`, no bounce on success).

## 7. Build phases

0. **Paystack conversation and test account** (Curtis): open a Paystack Kenya account for Travada Systems and get test keys; ask Q1–Q5.
   _Gate:_ the model decision (A vs B) is made.
1. **Provider layer + Paystack backend:** migration (`payment_accounts`, `payment_attempts`, `payment_webhook_events`, `payment_provider` enum); `_shared/paystack.ts`; edge functions `payments-connect-paystack`, `invoice-pay-paystack`, `payments-webhook-paystack`, `invoice-payment-status`; the re-verify scheduled task. Test with Paystack test cards and test M-Pesa numbers.
   _Gate:_ a test payment marks a test invoice paid via webhook, and again via verify with the webhook disabled; a duplicate webhook does nothing.
2. **UI:** settings page, invoice settings toggle, public Pay sheet with Paystack Popup, success/processing states.
   _Gate:_ full + partial balance paid from a phone on the public page.
3. **Live pilot:** go live on Travada's own invoices, then a handful of Kenyan beta orgs. Flip `PAYMENTS_ENABLED` per org (or globally once happy).
4. **Follow-ups:** refunds, settlement-to-bank-transaction matching, payer-chosen partial amounts, Pesalink, a per-invoice provider picker once a second provider exists, and the help-centre guide + website `/payments` page update.

## 8. Questions for Paystack

1. Can a **subaccount settle to an M-Pesa wallet, Till or Paybill** instead of a bank account? (Main accounts can, per your Kenya pricing page.)
2. For subaccounts, **who carries refunds, chargebacks and fraud losses**: the main account or the subaccount? What controls do we have (holding settlement, deactivating a subaccount)?
3. Can a platform onboard **subaccounts that aren't registered businesses** (freelancers, sole traders)? What KYC, if any, does Paystack run on subaccounts, and what must we collect?
4. Do your **platform/marketplace terms** need a separate agreement for a SaaS that onboards many independent businesses as subaccounts?
5. Pricing at our expected volume, and whether **M-Pesa offline (Paybill)** and **Pesalink** can be enabled on our account.

## 9. Other regions (later providers on the same layer)

- **UAE:** Lean Pay by Bank (Single Instant Payments into a per-merchant payment destination; Account-on-File for recurring invoices; 50,000 AED per-payment cap). Blocked on Lean confirming per-merchant destinations and whether a foreign (Kenyan) company can use them (asked via Lean's contact form, 2026-10-13). Reconciliation would use our own bank sync, since Lean's reconciliation only supports one collection account per application.
- **Nigeria / Ghana / South Africa:** Paystack again, same code, different currencies and channels.
- **US / EU / UK:** Stripe Connect needs Travada to have an entity in a Stripe-supported country (e.g. a US company via Stripe Atlas). That's a business decision, not a code one.
- **Kenya alternatives:** IntaSend (freelancer-friendly KYC) and direct Daraja (own Paybill/Till, cheapest) stay in `CONNECTED-ACCOUNTS-PLAN.md` §7 as later providers.

## Sources

- Paystack docs: [Split payments](https://paystack.com/docs/payments/split-payments/) · [Subaccount API](https://paystack.com/docs/api/subaccount/) · [Payment channels](https://paystack.com/docs/payments/payment-channels/) · [Transfer recipients](https://paystack.com/docs/transfers/creating-transfer-recipients/) · [List banks](https://paystack.com/docs/api/miscellaneous/) · [Payment Requests API](https://paystack.com/docs/api/payment-request/) (not used: duplicates our invoicing) · [Kenya pricing](https://paystack.com/ke/pricing)
- Paystack Kenya CBK licence: [Culture Custodian](https://culturecustodian.com/paystack-is-now-an-authorised-payment-service-provider-in-kenya/) · Stripe in Kenya via Paystack: [The Banking Brief](https://the-banking-brief.beehiiv.com/p/stripe-lands-in-kenya-m-pesa-payouts-unleash-global-reach-for-african-businesses-c456)
- Midday reference: `packages/app-store/src/stripe-payments/`, `apps/dashboard/src/components/invoice/payment-modal.tsx`
