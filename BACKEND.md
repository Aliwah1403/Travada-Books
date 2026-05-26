# Travada Books — Backend Progress

One stage at a time. Each stage is validated before moving to the next.

## Stages

| # | Stage | Status |
|---|---|---|
| 0 | Supabase MCP Setup | ✅ Done | 
| 1 | Auth (Supabase Auth) | ✅ Done |
| 2 | Database Schema | ✅ Done — awaiting full validation |
| 2.5 | Onboarding Flow | ✅ Done — awaiting validation |
| 3 | Customers CRUD | ⬜ Not Started |
| 4 | Invoices CRUD | ⬜ Not Started |
| 5 | PDF + Public Invoice Links | ⬜ Not Started |
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
