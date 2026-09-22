import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@travada-books/ui/components/card";
import {
  EyeIcon,
  EyeOffIcon,
  Building01Icon,
  InboxIcon,
  Invoice01Icon,
  TickIcon,
  User02Icon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";
import { useTheme } from "@/components/theme-provider";

/**
 * ── Onboarding UI playground ────────────────────────────────────────────────
 *
 * A standalone REPLICA of the onboarding flow for UI/UX work. Nothing here is
 * wired to anything: no auth context, no Supabase, no router navigation, no
 * real components imported. Every button just moves local state, so you can
 * click through in any order, forwards or backwards, as many times as you like
 * without creating an org, sending an invite or getting redirected.
 *
 * That means it is a COPY and will drift from the real screens. The originals:
 *   1. apps/app/src/pages/auth/signup.tsx
 *   2. apps/app/src/pages/auth/signup-verify.tsx
 *   3. apps/app/src/pages/onboarding/org.tsx          + layouts/onboarding-layout.tsx
 *   4. apps/app/src/pages/onboarding/invite.tsx       + layouts/onboarding-layout.tsx
 *   5. apps/app/src/components/onboarding/onboarding-checklist.tsx
 *
 * Redesign here freely, then port what you like back to those files.
 */

const STEPS = [
  { id: 1, label: "Sign up", route: "/signup" },
  { id: 2, label: "Verify", route: "/signup/verify" },
  { id: 3, label: "Business", route: "/onboarding/org" },
  { id: 4, label: "Invite", route: "/onboarding/invite" },
  { id: 5, label: "Checklist", route: "sidebar popover" },
] as const;

// ─── Shared chrome ──────────────────────────────────────────────────────────

function Brand() {
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;
  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <img src={logo} alt="Travada Books" className="size-9" />
      <span className="text-base font-semibold">Travada Books</span>
    </div>
  );
}

function PoweredBy() {
  return (
    <p className="mt-8 text-xs text-muted-foreground">
      Powered by{" "}
      <span className="underline underline-offset-4">Travada Systems</span>
    </p>
  );
}

/** Mirrors layouts/auth-layout.tsx — logo, card slot, footer. */
function AuthChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center">
      <Brand />
      <div className="w-full max-w-md">{children}</div>
      <PoweredBy />
    </div>
  );
}

/** Mirrors layouts/onboarding-layout.tsx — logo, two-step stepper, card slot. */
function OnboardingChrome({
  activeIndex,
  children,
}: {
  activeIndex: number;
  children: ReactNode;
}) {
  const steps = [
    { label: "Your business" },
    { label: "Invite team" },
  ];
  return (
    <div className="flex w-full flex-col items-center">
      <Brand />
      <div className="mb-6 flex items-center gap-2">
        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={step.label} className="flex items-center gap-2">
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
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mb-4 h-px w-12 transition-colors",
                    isDone ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-md">{children}</div>
      <PoweredBy />
    </div>
  );
}

// ─── 1. Sign up ─────────────────────────────────────────────────────────────

function SignupScreen({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthChrome>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-base">Create your account</CardTitle>
          <CardDescription>
            Get started with Travada Books for free
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" className="w-full gap-2" type="button">
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-name">Full name</Label>
              <Input
                id="pv-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-email">Email</Label>
              <Input
                id="pv-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-password">Password</Label>
              <div className="relative">
                <Input
                  id="pv-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOffIcon size={15} />
                  ) : (
                    <EyeIcon size={15} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <span className="size-3.5 rounded-[3px] bg-primary" />
              Cloudflare Turnstile — renders only when a site key is set
            </div>

            <Button type="button" className="w-full" onClick={onNext}>
              Create account
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <span className="text-foreground underline-offset-4">Sign in</span>
          </p>
        </CardContent>
      </Card>
    </AuthChrome>
  );
}

// ─── 2. Verify (8-digit OTP) ────────────────────────────────────────────────

const OTP_LENGTH = 8;

function VerifyScreen({ onNext }: { onNext: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isFilled = digits.every(Boolean);

  function focusAt(index: number) {
    inputRefs.current[index]?.focus();
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) focusAt(index - 1);
    else if (e.key === "ArrowLeft" && index > 0) focusAt(index - 1);
    else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1)
      focusAt(index + 1);
  }

  return (
    <AuthChrome>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-base">Check your email</CardTitle>
          <CardDescription>
            We sent an 8-digit verification code to{" "}
            <span className="font-medium text-foreground">you@example.com</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex justify-center gap-2.5">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="size-11 rounded-md border bg-background text-center text-base font-semibold tracking-widest caret-transparent outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                disabled={!isFilled}
                onClick={onNext}
              >
                Verify code
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <span className="text-foreground underline-offset-4">
                  Resend code in 30s
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthChrome>
  );
}

// ─── 3. Your business ───────────────────────────────────────────────────────

function OrgScreen({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <OnboardingChrome activeIndex={0}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-base">
            Tell us about your business
          </CardTitle>
          <CardDescription>
            This is how your invoices will be identified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-biz-name">Business name</Label>
              <Input
                id="pv-biz-name"
                placeholder="Acme Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pv-biz-email">Business email</Label>
              <Input
                id="pv-biz-email"
                type="email"
                placeholder="billing@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used as the reply-to address on invoice and quote emails sent to
                clients.
              </p>
            </div>

            {/* Real screen uses CurrencySelect / CountryDropdown — static here
                so the playground has no data dependencies. */}
            <div className="flex flex-col gap-1.5">
              <Label>Base currency</Label>
              <div className="flex h-9 items-center justify-between rounded-md border bg-transparent px-3 text-xs">
                <span>KES — Kenyan Shilling</span>
                <span className="text-muted-foreground">▾</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <div className="flex h-9 items-center justify-between rounded-md border bg-transparent px-3 text-xs">
                <span>Kenya</span>
                <span className="text-muted-foreground">▾</span>
              </div>
            </div>

            <Button type="button" className="w-full" onClick={onNext}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingChrome>
  );
}

// ─── 4. Invite team ─────────────────────────────────────────────────────────

const MAX_INVITES = 2;

function InviteScreen({ onNext }: { onNext: () => void }) {
  const [emails, setEmails] = useState<string[]>([""]);

  return (
    <OnboardingChrome activeIndex={1}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-base">Invite your team</CardTitle>
          <CardDescription>
            Add up to {MAX_INVITES} more people — or skip and do it later from
            Settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {emails.map((email, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`pv-invite-${i}`}>Email address</Label>
                    {emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEmails((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-xs text-muted-foreground fine-hover:text-destructive"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    id={`pv-invite-${i}`}
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmails((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                </div>
              ))}
            </div>

            {emails.length < MAX_INVITES && (
              <button
                type="button"
                onClick={() => setEmails((prev) => [...prev, ""])}
                className="self-start text-xs text-muted-foreground underline-offset-4 fine-hover:underline"
              >
                + Add another
              </button>
            )}

            <div className="flex flex-col gap-2">
              <Button type="button" className="w-full" onClick={onNext}>
                Send invites
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onNext}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </OnboardingChrome>
  );
}

// ─── 5. Sidebar checklist ───────────────────────────────────────────────────

type PreviewStep = {
  id: string;
  title: string;
  description: string;
  icon: Icon;
};

const CHECKLIST_STEPS: PreviewStep[] = [
  {
    id: "business_profile",
    title: "Set up your business",
    description: "Your name and contact email appear on every invoice.",
    icon: Building01Icon,
  },
  {
    id: "first_customer",
    title: "Add your first customer",
    description: "Save their details once and reuse them on every document.",
    icon: User02Icon,
  },
  {
    id: "first_invoice",
    title: "Send your first invoice",
    description: "Create it, send it, and track when it gets viewed.",
    icon: Invoice01Icon,
  },
  {
    id: "first_payment",
    title: "Record a payment",
    description: "Mark an invoice paid — part payments count too.",
    icon: Wallet01Icon,
  },
  {
    id: "first_expense",
    title: "Record your first expense",
    description: "Start tracking money out, not just money in.",
    icon: InboxIcon,
  },
];

function ChecklistScreen() {
  // Click rows to tick them — the real one derives this from an RPC.
  const [done, setDone] = useState<Record<string, boolean>>({
    business_profile: true,
  });
  const total = CHECKLIST_STEPS.length;
  const doneCount = CHECKLIST_STEPS.filter((s) => done[s.id]).length;
  const pct = (doneCount / total) * 100;
  const allDone = doneCount === total;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-xs text-muted-foreground">
        Opens from the sidebar, above the org switcher. Click rows to tick them.
      </p>
      <div className="w-80 overflow-hidden rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Get set up</p>
            <p className="font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase">
              {doneCount} of {total} complete
            </p>
          </div>
          <div className="relative size-9 shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                strokeWidth="3"
                className="stroke-foreground/10"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={88}
                strokeDashoffset={88 - (pct / 100) * 88}
                className="stroke-foreground transition-[stroke-dashoffset] duration-200 [transition-timing-function:var(--ease-out)]"
              />
            </svg>
          </div>
        </div>

        <ul className="divide-y border-t">
          {CHECKLIST_STEPS.map((step) => {
            const isDone = Boolean(done[step.id]);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() =>
                    setDone((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                  }
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors fine-hover:bg-muted/50 active:opacity-80"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                      isDone
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "border border-muted-foreground/30",
                    )}
                  >
                    {isDone && <TickIcon size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                  <step.icon
                    size={16}
                    className="mt-0.5 shrink-0 text-muted-foreground/60"
                  />
                </button>
              </li>
            );
          })}

          {allDone && (
            <li className="bg-muted/30 px-4 py-3 text-center">
              <p className="text-sm">You&apos;re all set up.</p>
              <Button variant="ghost" size="sm" className="mt-2">
                Hide checklist
              </Button>
            </li>
          )}
        </ul>

        {!allDone && (
          <div className="border-t px-2 py-1.5 text-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function OnboardingPreviewPage() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    document.title = "Onboarding playground — Travada Books";
    return () => {
      document.title = "Travada Books";
    };
  }, []);

  const current = STEPS.find((s) => s.id === step) ?? STEPS[0];
  const next = () => setStep((s) => (s >= STEPS.length ? 1 : s + 1));

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h1 className="text-sm font-semibold">Onboarding playground</h1>
            <p className="text-xs text-muted-foreground">
              A replica — nothing is wired to auth, Supabase or the router.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors active:opacity-80",
                  s.id === step
                    ? "bg-foreground text-background"
                    : "text-muted-foreground fine-hover:bg-muted fine-hover:text-foreground",
                )}
              >
                <span className="font-mono opacity-60">{s.id}</span> {s.label}
              </button>
            ))}
            <span className="ml-auto font-mono text-[0.6875rem] text-muted-foreground">
              {current.route}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-center px-4 py-12">
        {step === 1 && <SignupScreen onNext={next} />}
        {step === 2 && <VerifyScreen onNext={next} />}
        {step === 3 && <OrgScreen onNext={next} />}
        {step === 4 && <InviteScreen onNext={next} />}
        {step === 5 && <ChecklistScreen />}
      </div>
    </div>
  );
}
