# Transactions + Vault Adoption Push — Existing Customers

Companion note to the in-app dialog nudge and announcement email shipped alongside this file. Covers what was built, how to trigger the one-off email, and a script for the demo video (not yet recorded).

---

## What shipped

1. **In-app dialog nudge** — `apps/web/src/components/dashboard/transactions-vault-nudge-dialog.tsx`, mounted in `AppLayout`. Shows once per user on their next login (gated on `users.transactions_vault_nudge_seen_at`), highlights both features with a direct link into each, dismissible via "Maybe later" or the close button. Never reappears once dismissed or once a feature link is clicked.
2. **Announcement email** — `apps/worker/src/emails/transactions-vault-announcement.tsx` (+ matching preview copy in `apps/web/src/emails/`) and the one-off task `apps/worker/src/trigger/transactions-vault-announcement.ts`. Sends once to every existing user with an active org (`users.transactions_vault_announcement_sent_at`). Deliberately a separate, softer-toned template from `transactions-vault-launch.tsx` (the "Say hello to Transactions and Vault — now live!" email) — that one already went out at feature launch, so re-sending it here as a "nudge" would be a confusing duplicate for anyone who already got it. This one reads as a re-engagement nudge, not a launch announcement.
3. **Migration** — `supabase/migrations/20260719000000_add_transactions_vault_nudge_flags.sql` adds both tracking columns.

## How to preview the email

`npm run email --workspace=web` starts the React Email dev server (reads `apps/web/src/emails/`) at `http://localhost:3001` — find `transactions-vault-announcement` in the sidebar there.

## How to send the announcement email

This is a one-off `task()`, not a cron schedule — it will not run on its own. Trigger it exactly once via the Trigger.dev dashboard's "Test" run for `transactions-vault-announcement`, after deploying the worker. Re-running it later is safe (it only reaches users who haven't been stamped yet), so there's no risk in a retry if a batch fails partway.

## Video script (60–75s, screen-recorded)

Not recorded yet — this is the shot list/talking points for whoever records it (Loom or similar). Embed the resulting link in the email and/or a future version of the in-app dialog once it exists.

**Tone:** same as the emails — first-person, founder voice, casual not corporate.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:08 | Dashboard, cursor idle | "If you're only using Travada Books for invoices, you're leaving two features on the table that can save you real time. Let me show you." |
| 0:08–0:25 | Click into Transactions, drag a bank statement CSV onto the page | "Transactions is your money ledger. Drop in a bank statement — CSV or PDF — and it categorizes every line automatically. No manual entry." |
| 0:25–0:35 | Scroll the categorized list, point at income/expense stats | "You get income, expenses, and totals at a glance, plus a search bar that understands plain English — try 'coffee last month over $50'." |
| 0:35–0:42 | Drag a receipt image onto the Transactions page, show it routing to Inbox and auto-matching | "Got a loose receipt? Drop the image in and it matches itself to the right transaction automatically." |
| 0:42–0:50 | Switch to Vault, drag in a PDF contract | "Vault is the other one — secure storage for every company document, not just financial paperwork. Upload anything and it's auto-tagged and summarized." |
| 0:50–0:58 | Click "Extract to transaction" on a receipt in Vault | "You can even pull a receipt straight into a transaction — Travada reads the amount, date, and vendor for you." |
| 0:58–1:05 | Click share icon on a Vault doc, show the generated link | "Need to send a document to someone? Share a secure link — no login required on their end." |
| 1:05–1:12 | Cut back to dashboard | "Both are already in your account. Give them a try — it's a couple of minutes that'll save you a lot more down the line." |

**Shot prep notes:**
- Use a demo org with realistic-looking (not obviously fake) sample data — a handful of categorized transactions, one or two Vault documents already present, so the empty states don't show.
- Record at 1280×720 minimum; Loom's default browser-tab capture is fine.
- No need for a talking-head webcam bubble — screen + voiceover only, matches the plain, low-production tone of the existing emails.
