# Travada Books — Backend Progress

One stage at a time. Each stage is validated before moving to the next.

## Stages

| # | Stage | Status |
|---|---|---|
| 0 | Supabase MCP Setup | ✅ Done |
| 1 | Auth (Supabase Auth) | ✅ Done |
| 2 | Database Schema | ✅ Done — awaiting validation |
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
