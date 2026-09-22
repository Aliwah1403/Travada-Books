import { useRef, useState, type ReactNode } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import { EyeIcon, EyeOffIcon } from "@travada-books/ui/icons";
import { AuthFigure } from "@/pages/preview/auth-figure";
import { SplitLayout } from "@/pages/preview/split-layout";

/**
 * ── Auth UI playground — split-screen variant ───────────────────────────────
 *
 * A REPLICA of the three auth screens (sign in, sign up, verify), built to
 * sit behind onboarding.tsx's layout toggle next to the split onboarding
 * flow. Same rules as every other file in this directory: nothing here is
 * wired to auth, Supabase or the router — every control just moves local
 * state. The originals:
 *   1. apps/app/src/pages/auth/login.tsx
 *   2. apps/app/src/pages/auth/signup.tsx
 *   3. apps/app/src/pages/auth/signup-verify.tsx
 *
 * The screen components below are written fresh rather than imported from
 * onboarding.tsx — SignupScreen/VerifyScreen there aren't exported, and that
 * file's "Current" variant must keep rendering exactly as it does, so it
 * isn't touched beyond adding the layout toggle option.
 */

const EYEBROW =
  "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";

type AuthScreen = "signin" | "signup" | "verify";

// ─── Shared form chrome ─────────────────────────────────────────────────────

function FormHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className={EYEBROW}>{eyebrow}</p>
      <h1 className="mt-3 font-heading text-3xl text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function GoogleButton() {
  return (
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
  );
}

function OrSeparator() {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground">or</span>
      <Separator className="flex-1" />
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  rightSlot,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rightSlot?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Password</Label>
        {rightSlot}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground fine-hover:text-foreground"
        >
          {show ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── 1. Sign in ─────────────────────────────────────────────────────────────

function SignInScreen({
  onSignIn,
  onGoToSignUp,
}: {
  onSignIn: () => void;
  onGoToSignUp: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <FormHeader
        eyebrow="Welcome back"
        title="Sign in to your account"
        subtitle="Enter your email and password below"
      />
      <div className="flex flex-col gap-4">
        <GoogleButton />
        <OrSeparator />
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-signin-email">Email</Label>
            <Input
              id="as-signin-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PasswordField
            id="as-signin-password"
            value={password}
            onChange={setPassword}
            rightSlot={
              <span className="text-xs text-foreground underline-offset-4 fine-hover:underline">
                Forgot password?
              </span>
            }
          />
          <Button type="button" className="w-full" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onGoToSignUp}
          className="text-foreground underline-offset-4 fine-hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}

// ─── 2. Sign up ─────────────────────────────────────────────────────────────

function SignUpScreen({
  onCreateAccount,
  onGoToSignIn,
}: {
  onCreateAccount: () => void;
  onGoToSignIn: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <FormHeader
        eyebrow="Get started"
        title="Create your account"
        subtitle="Get started with Travada Books for free"
      />
      <div className="flex flex-col gap-4">
        <GoogleButton />
        <OrSeparator />
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-signup-name">Full name</Label>
            <Input
              id="as-signup-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-signup-email">Email</Label>
            <Input
              id="as-signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PasswordField
            id="as-signup-password"
            value={password}
            onChange={setPassword}
          />

          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="size-3.5 rounded-[3px] bg-primary" />
            Cloudflare Turnstile — renders only when a site key is set
          </div>

          <Button type="button" className="w-full" onClick={onCreateAccount}>
            Create account
          </Button>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onGoToSignIn}
          className="text-foreground underline-offset-4 fine-hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

// ─── 3. Verify (8-digit OTP) ────────────────────────────────────────────────

const OTP_LENGTH = 8;

function VerifyScreen() {
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
    <div>
      <FormHeader
        eyebrow="One more step"
        title="Check your email"
        subtitle={
          <>
            We sent an 8-digit verification code to{" "}
            <span className="font-medium text-foreground">you@example.com</span>
          </>
        }
      />
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
          <Button type="button" className="w-full" disabled={!isFilled}>
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
    </div>
  );
}

// ─── Flow ───────────────────────────────────────────────────────────────────

export function AuthSplitFlow() {
  const [screen, setScreen] = useState<AuthScreen>("signin");

  return (
    <SplitLayout
      figure={<AuthFigure screen={screen} />}
      form={
        <div className="w-full max-w-sm">
          {screen === "signin" && (
            <SignInScreen
              onSignIn={() => {}}
              onGoToSignUp={() => setScreen("signup")}
            />
          )}
          {screen === "signup" && (
            <SignUpScreen
              onCreateAccount={() => setScreen("verify")}
              onGoToSignIn={() => setScreen("signin")}
            />
          )}
          {screen === "verify" && <VerifyScreen />}
        </div>
      }
    />
  );
}
