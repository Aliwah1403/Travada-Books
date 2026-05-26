# Travada Books — Backend Progress

One stage at a time. Each stage is validated before moving to the next.

## Stages

| # | Stage | Status |
|---|---|---|
| 0 | Supabase MCP Setup | ✅ Done |
| 1 | Auth (Supabase Auth) | ✅ Done |
| 2 | Database Schema | ✅ Done |
| 2.5 | Onboarding Flow | ✅ Done |
| 3 | Customers CRUD | ✅ Done |
| 4 | Invoices CRUD | ✅ Done |
| 4.5 | Statements | ✅ Done |
| 5 | PDF + Public Invoice Links | 🔲 In Progress — public pages wired, PDF download not yet built |
| 5.5 | Client Payment Submission | ⬜ Not Started |
| 6 | Email (Resend via Edge Function) | ⬜ Not Started |
| 7 | Background Jobs (Trigger.dev) | ⬜ Not Started |

---

## Stage 1 — Auth

**Goal:** Real sign-up, login, logout, and forgot-password flow. Unauthenticated users cannot access the dashboard.

**What was built:**
- `apps/web/src/lib/supabase.ts` — singleton Supabase client
- `apps/web/src/contexts/auth-context.tsx` — session context + `useAuth` hook
- Auth guard in `App.tsx` — protected routes redirect to `/login`
- All 5 auth pages wired to Supabase Auth
- Header updated: real user name/email + sign-out button

**Env vars needed:**
```
VITE_SUPABASE_URL=https://urzlponhxguhqqmcktuk.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key from Supabase dashboard>
```

**Verify:**
1. Sign up with email/password → check Supabase Auth dashboard for new user
2. Verify email (or disable email confirmation in Supabase → Auth → Providers → Email)
3. Log in → dashboard loads
4. Sign out → redirected to `/login`
5. Open `/invoices` without being logged in → redirected to `/login`
6. Forgot password → enter email → get OTP in email → enter OTP → set new password → redirected to login

---

## Stage 2.5 — Onboarding Flow

**Goal:** After a new user signs up, walk them through creating their organization before they reach the dashboard. A user with no org cannot use any core feature, so this gate is mandatory.

**Why this exists:** The `handle_new_user` DB trigger was removed in favor of an explicit onboarding UI — users need to provide business details (name, currency, country, etc.) that a trigger can't know. The trigger approach would only create a blank org with no meaningful data.

**Flow (3 steps, no back-navigation between steps):**

```
Sign up → /onboarding/org        (Step 1: Business details)
        → /onboarding/invite     (Step 2: Invite team members or skip)
        → /invoices              (Dashboard — org now exists)
```

**Step 1 — Business details (`/onboarding/org`)**

Fields:
- Business name (required)
- Base currency (required, default KES)
- Country (required, default Kenya)
- Tax ID / KRA PIN (optional)
- Email (optional, pre-filled from auth user email)
- Phone (optional)
- Website (optional)

On submit: `INSERT INTO organizations (...)` then `INSERT INTO organization_members (org_id, user_id, role: 'owner')`. Navigate to step 2.

**Step 2 — Invite members (`/onboarding/invite`)**

- Input to enter one or more email addresses
- Role selector per invite (accountant / sender / viewer)
- "Skip for now" button at the bottom
- Invite mechanism: for MVP, just insert placeholder rows into `organization_members` with `status: 'invited'` (add `status` column if not already there) — actual email sending is Stage 6

On submit or skip: navigate to `/invoices`.

**Auth guard changes:**

- After login/signup, before redirecting to `/invoices`, check if user has any org memberships (`SELECT count(*) FROM organization_members WHERE user_id = auth.uid()`).
- If count = 0 → redirect to `/onboarding/org`.
- If count > 0 → proceed to `/invoices` as normal.
- The onboarding routes (`/onboarding/*`) must be accessible only to authenticated users (use `AppLayout` or a dedicated `OnboardingLayout` that checks for a session but does NOT require an org).
- Once org exists, navigating to `/onboarding/*` redirects to `/invoices`.

**Context change:**

Add `orgId: string | null` and `orgLoading: boolean` to `auth-context.tsx`. After session loads, query `organization_members` for the user's first org. Expose `orgId` so any component can know which org to scope queries to.

**Files to create/touch:**
- `apps/web/src/pages/onboarding/org.tsx`
- `apps/web/src/pages/onboarding/invite.tsx`
- `apps/web/src/layouts/onboarding-layout.tsx` — centered, step indicator, Travada logo (same visual style as auth layout)
- `apps/web/src/contexts/auth-context.tsx` — add `orgId` + `orgLoading`
- `apps/web/src/App.tsx` — add `/onboarding/org` and `/onboarding/invite` routes under `OnboardingLayout`

**DB change (if needed):**
- Add `status text DEFAULT 'active' CHECK IN ('active', 'invited')` to `organization_members` if invite stub rows are used in Step 2.

**Done when:**
1. New sign-up → lands on `/onboarding/org`
2. Fill business details → org row visible in Supabase Studio
3. Step 2 skip → lands on `/invoices`
4. Logging in with an existing org → goes straight to `/invoices`, skips onboarding
5. Navigating to `/onboarding/*` when org already exists → redirects to `/invoices`

---

## Stage 3 — Customers CRUD

**Status:** ✅ Done

**What was built:**
- `apps/web/src/lib/queries/customers.ts` — `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`
- Customers list page wired — real data, empty state
- Create/edit/delete customer sheets wired with TanStack Query mutations
- Customer detail page — invoice list, stats, generate statement sheet
- Customer list table columns populated with real invoice aggregates (invoice count, total paid, outstanding, last invoice date) via `listAllCustomerInvoiceSummaries`

---

## Stage 4 — Invoices CRUD

**Status:** ✅ Done

**What was built:**
- `apps/web/src/lib/queries/invoices.ts` — full CRUD + `getNextInvoiceNumber`, `getInvoiceByToken`, `listCustomerInvoices`, `listAllCustomerInvoiceSummaries`
- Create invoice page — line items, JSONB snapshot, auto-generated invoice number, `accept_payments` flag, `from_details`/`customer_details` snapshots on send
- Edit invoice page — same as create, pre-populated from invoice row
- Invoice detail page — status changes, duplicate action, send (snapshots org + customer details)
- Invoice list page — full table with actions (duplicate, copy link, mark paid, delete)
- Per-customer invoice number uniqueness enforced via DB partial unique index; inline error shown on conflict
- Invoice settings persisted to `invoice_templates` table — loaded on every new invoice

---

## Stage 4.5 — Statements

**Status:** ✅ Done

**What was built:**
- `statements` table — `id`, `org_id`, `customer_id`, `token`, `date_from`, `date_to`, `notes`, `snapshot_data` (JSONB), `from_details` (JSONB), `customer_details` (JSONB)
- `apps/web/src/lib/queries/statements.ts` — `createStatement`, `getStatementByToken`
- Generate statement sheet on customer detail — date range picker, filters invoices, builds snapshot, creates statement row, shows shareable link
- Public statement page (`/s/:token`) — letterhead, ledger table (charges/payments/running balance), summary totals, copy link

---

## Stage 5 — PDF + Public Invoice Links

**Status:** 🔲 In Progress

**Done:**
- Public invoice page (`/i/:token`) — fully wired to real data, `from_details`/`customer_details` rendered, `accept_payments` gates the Pay button, copy link
- Public statement page (`/s/:token`) — fully wired, ledger view

**Remaining:**
- PDF download — "Download PDF" buttons exist on invoice detail and public invoice page but do nothing yet
- `viewed_at` update when public invoice is loaded

---

## Stage 5.5 — Client Payment Submission

**Status:** ⬜ Not Started

**What to build:**
- `invoice_payments` table — `id`, `invoice_id`, `org_id`, `amount`, `currency`, `payment_method`, `proof_url`, `note`, `submitted_at`, `status` (pending/confirmed/rejected), `confirmed_at`, `confirmed_by`
- Add `partial` to invoice status enum
- Supabase Storage bucket `payment-proofs` — private, signed URLs
- Public invoice page: payment submission form (amount, method, proof upload, note) when `accept_payments = true`
- Invoice detail: "Payments" tab showing submitted proofs with Confirm / Reject actions
- `confirmPayment` RPC — updates payment status, recomputes invoice balance, flips invoice to `partial` or `paid`

**Key design decision:** Payments are never auto-applied. Business must confirm, preventing Mpesa screenshot fraud.

---

## Stage 6 — Email (Resend via Edge Function)

**Status:** ⬜ Not Started

**To build:**
- Edge Function `send-invoice-email` — sends invoice link via Resend, updates `sent_at`
- Edge Function `send-statement-email` — sends statement link to customer billing email
- Wire "Send Invoice" button and "Send to [customer]" button in statement sheet

---

## Stage 7 — Background Jobs (Trigger.dev)

**Status:** ⬜ Not Started

**To build:**
- `mark-overdue` daily cron — flips `unpaid` invoices past due date to `overdue`
- `exchange-rate-sync` daily cron — caches rates from Frankfurter API
- At-creation overdue check — if sending an invoice with a past due date, set `overdue` immediately
