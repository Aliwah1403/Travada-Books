import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { Badge } from "@travada-books/ui/components/badge";
import { cn } from "@travada-books/ui/lib/utils";
import LogoGreen from "@/assets/Logo-Green.svg";

import { SignupPage } from "@/pages/auth/signup";
import { SignupVerifyPage } from "@/pages/auth/signup-verify";
import { OnboardingOrgPage } from "@/pages/onboarding/org";
import { OnboardingInvitePage } from "@/pages/onboarding/invite";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import type { OnboardingChecklistStatus } from "@/lib/queries/onboarding";

/**
 * ── Sandbox wrapper ─────────────────────────────────────────────────────────
 *
 * Every screen below renders the REAL component, not a copy — editing the
 * actual onboarding/auth pages updates this preview live.
 *
 * There is deliberately NO nested router here. React Router asserts
 * "You cannot render a <Router> inside another <Router>", so wrapping each
 * screen in a MemoryRouter throws on sight. Instead every screen shares this
 * page's own location, which is engineered in OnboardingPreviewPage to satisfy
 * all of their guards at once (see the navigate() there).
 *
 * What this wrapper does is stop the screens from acting on the real backend:
 *
 *   - onSubmitCapture blocks every form submit. Capture phase runs before the
 *     form's own onSubmit, so stopPropagation() prevents it ever arriving.
 *     Without this, a logged-in visitor clicking "Continue" on the org screen
 *     would create a REAL organization, and the invite screen would send REAL
 *     invite emails. Do not remove this.
 *   - onClickCapture swallows anchor clicks, so the checklist's <Link> rows
 *     highlight and do nothing instead of navigating away from the preview.
 *
 * Known gap: a button that calls navigate() directly rather than submitting a
 * form still navigates — "Skip for now" on the invite screen is the one case.
 * Blocking all clicks would make the screens dead to the touch, which defeats
 * the point of previewing them.
 */
function Sandbox({ children }: { children: ReactNode }) {
  return (
    <div
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

type FrameProps = {
  number: number;
  route: string;
  note: string;
  children: ReactNode;
};

function Frame({ number, route, note, children }: FrameProps) {
  return (
    <div className="flex max-w-md flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Screen {number}</Badge>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {route}
          </code>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
      <div className="flex justify-center rounded-md bg-muted/40 p-6">
        {children}
      </div>
    </div>
  );
}

// ─── Onboarding chrome (logo + stepper) ────────────────────────────────────
// Reproduced from apps/app/src/layouts/onboarding-layout.tsx, which is the
// source of truth for the real logo + stepper markup. OnboardingLayout can't
// be reused directly here — it calls useAuth() and returns <Navigate> when
// there's no session, which would redirect this preview instead of rendering
// it. Keep this in sync manually; the two WILL drift if onboarding-layout.tsx
// changes and this file isn't updated to match.
const ONBOARDING_STEPS = [
  { path: "/onboarding/org", label: "Your business" },
  { path: "/onboarding/invite", label: "Invite team" },
];

function OnboardingChrome({
  activeIndex,
  children,
}: {
  activeIndex: number;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={LogoGreen} alt="Travada Books" className="size-8" />
        <span className="text-sm font-semibold">Travada Books</span>
      </div>

      <div className="mb-5 flex items-center gap-2">
        {ONBOARDING_STEPS.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={step.path} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground/50",
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-4 h-px w-8 transition-colors",
                    isDone ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full">{children}</div>
    </div>
  );
}

const CHECKLIST_PREVIEW_STATUS: OnboardingChecklistStatus = {
  business_profile: true,
  first_customer: false,
  first_invoice: false,
  first_payment: false,
  first_expense: false,
};

export function OnboardingPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // OnboardingInvitePage reads location.state.orgId and returns <Navigate> when
  // it's missing. Without a nested router every screen shares THIS page's
  // location, so the fix is to put the orgId on it: replace-navigate to
  // ourselves once, carrying the state the invite screen's guard needs.
  //
  // Until that lands, screen 4 must not mount at all — its <Navigate> would
  // fire against the real router and throw the visitor out of the preview.
  const previewOrgId = (location.state as { orgId?: string } | null)?.orgId;

  useEffect(() => {
    if (!previewOrgId) {
      navigate("/preview/onboarding", {
        replace: true,
        state: { orgId: "preview-org" },
      });
    }
  }, [previewOrgId, navigate]);

  useEffect(() => {
    document.title = "Onboarding preview — Travada Books";
    return () => {
      document.title = "Travada Books";
    };
  }, []);

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Onboarding — current state</h1>
          <p className="text-sm text-muted-foreground">
            These are the live onboarding and signup components, rendered
            read-only for review before redesigning them. Editing the real
            pages updates this preview.
          </p>
          <p className="text-sm text-destructive">
            Form submission is disabled on every screen below — nothing you
            type or click here reaches Supabase.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Frame
            number={1}
            route="/signup"
            note="No guard — renders for anyone. Email/password create-account form."
          >
            <Sandbox>
              <SignupPage />
            </Sandbox>
          </Frame>

          <Frame
            number={2}
            route="/signup/verify"
            note={
              'Redirects to /signup unless sessionStorage has a parseable signup_email — seeded below for this preview. It\'s an 8-digit OTP entry screen, not a "check your email" card.'
            }
          >
            <Sandbox>
              <SignupVerifySandbox />
            </Sandbox>
          </Frame>

          <Frame
            number={3}
            route="/onboarding/org"
            note="Normally rendered inside OnboardingLayout (logo + stepper, reproduced below — not reused, since that layout redirects when there's no session)."
          >
            <Sandbox>
              <OnboardingChrome activeIndex={0}>
                <OnboardingOrgPage />
              </OnboardingChrome>
            </Sandbox>
          </Frame>

          <Frame
            number={4}
            route="/onboarding/invite"
            note="Requires router state { orgId } or it redirects to /onboarding/org — this page replace-navigates to itself to supply it."
          >
            <Sandbox>
              <OnboardingChrome activeIndex={1}>
                {previewOrgId ? (
                  <OnboardingInvitePage />
                ) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Preparing router state…
                  </p>
                )}
              </OnboardingChrome>
            </Sandbox>
          </Frame>

          <Frame
            number={5}
            route="components/onboarding/onboarding-checklist"
            note="After onboarding — sidebar checklist popover. Shown here at a realistic 1-of-5 opening state."
          >
            <Sandbox>
              <div className="w-80 rounded-md border bg-background shadow-sm">
                <OnboardingChecklist
                  status={CHECKLIST_PREVIEW_STATUS}
                  onNavigate={() => {}}
                />
              </div>
            </Sandbox>
          </Frame>
        </div>
      </div>
    </div>
  );
}

// Seeds sessionStorage.signup_email / signup_next so SignupVerifyPage renders
// instead of redirecting, then restores whatever was there before (so a real
// signup happening in another tab isn't clobbered by this preview).
//
// SignupVerifyPage reads sessionStorage synchronously during render and
// redirects in its own mount effect if the email doesn't parse. React fires
// child effects before parent effects, so seeding storage from a useEffect
// here would run after that guard already saw an empty value — and gating
// the child's first render behind a `ready` flag set from an effect trips
// the react-hooks/set-state-in-effect lint rule. Instead, seed synchronously
// during this component's own first render (before SignupVerifyPage, a
// child, ever renders), guarded so it only runs once, and use the effect
// only for the cleanup-time restore.
function SignupVerifySandbox() {
  const restoreRef = useRef<{ email: string | null; next: string | null } | null>(null);

  // Lazy ref init guarded by a null-check, the one ref-during-render pattern
  // the react-hooks/refs rule allows — see its message for this exact shape.
  if (restoreRef.current === null) {
    restoreRef.current = {
      email: sessionStorage.getItem("signup_email"),
      next: sessionStorage.getItem("signup_next"),
    };
    sessionStorage.setItem("signup_email", "you@example.com");
    sessionStorage.setItem("signup_next", "/");
  }

  useEffect(() => {
    return () => {
      const prev = restoreRef.current;
      if (!prev) return;
      if (prev.email === null) sessionStorage.removeItem("signup_email");
      else sessionStorage.setItem("signup_email", prev.email);

      if (prev.next === null) sessionStorage.removeItem("signup_next");
      else sessionStorage.setItem("signup_next", prev.next);
    };
  }, []);

  return <SignupVerifyPage />;
}
