import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Upload01Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { SetupFigure } from "@/components/onboarding/setup-figure";
import { SplitLayout } from "@/components/auth/split-layout";

/**
 * ── Onboarding UI playground — split-screen variant ─────────────────────────
 *
 * A second, standalone REPLICA of onboarding, built to compare a split-screen
 * layout against the current centred-card flow (see onboarding.tsx, which
 * renders this component behind a "Split" toggle). Same rules as that file:
 * nothing here is wired to auth, Supabase or the router — every control just
 * moves local state.
 */

const EYEBROW =
  "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";

const COUNTRIES = [
  { value: "Kenya", label: "Kenya" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Uganda", label: "Uganda" },
  { value: "Tanzania", label: "Tanzania" },
  { value: "South Africa", label: "South Africa" },
  { value: "United States", label: "United States" },
];

const CURRENCIES = [
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "USD", label: "USD — US Dollar" },
];

const STEP_COUNT = 5;

// ─── Stepper ────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-10 flex flex-col gap-3">
      <p className={EYEBROW}>
        Step {String(step + 1).padStart(2, "0")} / 0{STEP_COUNT}
      </p>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-[width,background-color] duration-200 [transition-timing-function:var(--ease-out)]",
              i === step
                ? "w-5 bg-foreground"
                : i < step
                  ? "w-1.5 bg-foreground/70"
                  : "w-1.5 bg-foreground/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Shared step chrome ─────────────────────────────────────────────────────

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <p className={EYEBROW}>{eyebrow}</p>
      <h1 className="mt-3 font-heading text-3xl text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function NavRow({
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}: {
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft01Icon size={14} />
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {secondaryLabel && onSecondary && (
          <Button type="button" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
        <Button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="gap-1.5"
        >
          {primaryLabel}
          <ArrowRight01Icon size={14} />
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-input/20 px-2 pr-8 text-xs/relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ArrowDown01Icon
        size={14}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

// ─── 1. Business name ───────────────────────────────────────────────────────

function BusinessNameStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Your business"
        title="What's your business called?"
        subtitle="This is the name your clients see on every invoice."
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="split-business-name">Business name</Label>
        <Input
          id="split-business-name"
          placeholder="Acme Ltd"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <NavRow
        primaryLabel="Continue"
        onPrimary={onNext}
        primaryDisabled={value.trim().length === 0}
      />
    </div>
  );
}

// ─── 2. Where you invoice from ──────────────────────────────────────────────

function LocationStep({
  country,
  onCountryChange,
  currency,
  onCurrencyChange,
  email,
  onEmailChange,
  onBack,
  onNext,
}: {
  country: string;
  onCountryChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Money & location"
        title="Where do you invoice from?"
        subtitle="Sets your base currency and tax defaults. Both changeable later."
      />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="split-country">Country</Label>
            <SelectField
              id="split-country"
              value={country}
              onChange={onCountryChange}
              options={COUNTRIES}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="split-currency">Base currency</Label>
            <SelectField
              id="split-currency"
              value={currency}
              onChange={onCurrencyChange}
              options={CURRENCIES}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="split-email">Business email</Label>
          <Input
            id="split-email"
            type="email"
            placeholder="billing@yourbusiness.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used as the reply-to address on invoice and quote emails sent to
            clients.
          </p>
        </div>
      </div>
      <NavRow onBack={onBack} primaryLabel="Continue" onPrimary={onNext} />
    </div>
  );
}

// ─── 3. Make it yours ───────────────────────────────────────────────────────

function BrandStep({
  hasLogo,
  onToggleLogo,
  businessName,
  taxId,
  onTaxIdChange,
  onBack,
  onNext,
}: {
  hasLogo: boolean;
  onToggleLogo: () => void;
  businessName: string;
  taxId: string;
  onTaxIdChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const initial = businessName.trim().charAt(0).toUpperCase();
  return (
    <div>
      <StepHeader
        eyebrow="Brand"
        title="Make your invoices yours"
        subtitle="Both optional — invoices with a logo look established."
      />
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onToggleLogo}
          className="flex size-24 items-center justify-center rounded-md border border-dashed border-input text-muted-foreground transition-colors duration-200 [transition-timing-function:var(--ease-out)] fine-hover:border-foreground/40 fine-hover:text-foreground active:opacity-80"
        >
          {hasLogo ? (
            <span className="flex size-12 items-center justify-center rounded-md bg-primary/15 text-lg font-semibold text-primary">
              {initial || "?"}
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-[11px]">
              <Upload01Icon size={18} />
              Add logo
            </span>
          )}
        </button>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="split-tax-id">Tax ID</Label>
          <Input
            id="split-tax-id"
            placeholder="e.g. P051234567X"
            value={taxId}
            onChange={(e) => onTaxIdChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            KRA PIN in Kenya, TIN in Nigeria — whatever your invoices need.
          </p>
        </div>
      </div>
      <NavRow
        onBack={onBack}
        secondaryLabel="Skip"
        onSecondary={onNext}
        primaryLabel="Continue"
        onPrimary={onNext}
      />
    </div>
  );
}

// ─── 4. Invite your team ────────────────────────────────────────────────────

function TeamStep({
  invites,
  inviteEmail,
  onInviteEmailChange,
  onAddInvite,
  onRemoveInvite,
  onBack,
  onNext,
}: {
  invites: string[];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  onAddInvite: () => void;
  onRemoveInvite: (email: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Your team"
        title="Invite teammates"
        subtitle="Optional — you can add anyone later."
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="split-invite-email">Email address</Label>
            <Input
              id="split-invite-email"
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => onInviteEmailChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddInvite();
                }
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={onAddInvite}>
            Add
          </Button>
        </div>

        {invites.length === 0 ? (
          <div className="rounded-md border border-dashed border-input px-4 py-6 text-center text-xs text-muted-foreground">
            No invites yet. Add a few or skip — totally fine.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
              >
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => onRemoveInvite(email)}
                  aria-label={`Remove ${email}`}
                  className="text-muted-foreground transition-colors duration-200 [transition-timing-function:var(--ease-out)] fine-hover:text-destructive"
                >
                  <Cancel01Icon size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <NavRow
        onBack={onBack}
        primaryLabel={
          invites.length === 0
            ? "Skip for now"
            : `Send ${invites.length} invite${invites.length === 1 ? "" : "s"}`
        }
        onPrimary={onNext}
      />
    </div>
  );
}

// ─── 5. Ready ────────────────────────────────────────────────────────────────

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function ReadyStep({
  businessName,
  currency,
  inviteCount,
  onRestart,
}: {
  businessName: string;
  currency: string;
  inviteCount: number;
  onRestart: () => void;
}) {
  const members = inviteCount + 1;
  return (
    <div>
      <StepHeader
        eyebrow="You're set"
        title={`Welcome to ${businessName}.`}
        subtitle={
          inviteCount === 0
            ? "You're flying solo for now — invite teammates anytime from Settings."
            : `You've invited ${inviteCount} teammate${inviteCount === 1 ? "" : "s"} to join you.`
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <FactCard label="Business" value={businessName} />
        <FactCard label="Currency" value={currency} />
        <FactCard label="Members" value={String(members)} />
      </div>
      <Button type="button" className="mt-8 w-full" onClick={onRestart}>
        Take me in
      </Button>
    </div>
  );
}

// ─── Flow ───────────────────────────────────────────────────────────────────

export function OnboardingSplitFlow() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [currency, setCurrency] = useState("KES");
  const [taxId, setTaxId] = useState("");
  const [hasLogo, setHasLogo] = useState(false);
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const addInvite = () => {
    const value = inviteEmail.trim();
    if (!value || invites.includes(value)) return;
    setInvites((prev) => [...prev, value]);
    setInviteEmail("");
  };

  const removeInvite = (email: string) =>
    setInvites((prev) => prev.filter((e) => e !== email));

  const restart = () => setStep(0);

  return (
    <SplitLayout
      figure={
        <SetupFigure
          workspaceName={businessName}
          hasLogo={hasLogo}
          step={step}
        />
      }
      form={
        <div className="w-full max-w-sm">
          <Stepper step={step} />

          {step === 0 && (
            <BusinessNameStep
              value={businessName}
              onChange={setBusinessName}
              onNext={goNext}
            />
          )}

          {step === 1 && (
            <LocationStep
              country={country}
              onCountryChange={setCountry}
              currency={currency}
              onCurrencyChange={setCurrency}
              email={email}
              onEmailChange={setEmail}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {step === 2 && (
            <BrandStep
              hasLogo={hasLogo}
              onToggleLogo={() => setHasLogo((v) => !v)}
              businessName={businessName}
              taxId={taxId}
              onTaxIdChange={setTaxId}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {step === 3 && (
            <TeamStep
              invites={invites}
              inviteEmail={inviteEmail}
              onInviteEmailChange={setInviteEmail}
              onAddInvite={addInvite}
              onRemoveInvite={removeInvite}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {step === 4 && (
            <ReadyStep
              businessName={businessName}
              currency={currency}
              inviteCount={invites.length}
              onRestart={restart}
            />
          )}
        </div>
      }
    />
  );
}
