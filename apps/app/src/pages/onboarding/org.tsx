import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { CurrencySelect } from "@travada-books/ui/components/currency-select";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Upload01Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { CountryDropdown } from "@/components/country-dropdown";
import * as Sentry from "@sentry/react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { updateOrg, uploadOrgLogo } from "@/lib/queries/org";
import { LOGO_ACCEPT, prepareLogoFile } from "@/lib/logo-upload";
import { SplitLayout } from "@/components/auth/split-layout";
import { SetupFigure } from "@/components/onboarding/setup-figure";

/**
 * ── Onboarding wizard ────────────────────────────────────────────────────────
 *
 * Ported from pages/preview/onboarding-split.tsx (approved design) and wired to
 * the real Supabase writes that used to live in this file plus
 * pages/onboarding/invite.tsx (now deleted — see App.tsx, which points
 * /onboarding/invite at a redirect back here).
 *
 * Steps 1–2 collect business name, country, currency and business email — the
 * same four fields the old single-screen form submitted. The org row, owner
 * membership and category/vault seeding happen at the end of step 2, reusing
 * the original code path (including insertOwnerMembership's 3-attempt retry on
 * FK error 23503 — handle_new_user() can lag behind auth signup). Steps 3–4
 * then write against a real org id. Step 5 is a summary that refreshes auth
 * context and hands off to the app.
 *
 * `orgId` is held in state once the org exists so that going back to step 1 or
 * 2 and continuing again UPDATES the existing org instead of inserting a
 * second one.
 */

const STEP_COUNT = 5;

const EYEBROW =
  "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";

// handle_new_user() inserting the public.users row can lag behind auth signup; retry the FK-dependent insert briefly
async function insertOwnerMembership(orgId: string, userId: string) {
  const MAX_ATTEMPTS = 3;
  let lastError: { code?: string; message: string } | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await supabase
      .from("organization_members")
      .insert({
        org_id: orgId,
        user_id: userId,
        role: "owner",
        status: "active",
      });
    if (!error) return null;
    lastError = error;
    if (error.code !== "23503" || attempt === MAX_ATTEMPTS) return error;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return lastError;
}

// ─── Stepper ────────────────────────────────────────────────────────────────

/**
 * `total` is explicit so the count shown always matches the screens that are
 * actually coming — the old flow's stepper said "1 of 2" on what was really
 * the third of four screens.
 */
function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-10 flex flex-col gap-3">
      <p className={EYEBROW}>
        Step {String(step + 1).padStart(2, "0")} /{" "}
        {String(total).padStart(2, "0")}
      </p>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
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
  primaryLoading,
  secondaryLabel,
  onSecondary,
}: {
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="gap-1.5"
        >
          <ArrowLeft01Icon size={14} />
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {secondaryLabel && onSecondary && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSecondary}
            disabled={primaryLoading}
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
          className="gap-1.5"
        >
          {primaryLabel}
          <ArrowRight01Icon size={14} />
        </Button>
      </div>
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
        <Label htmlFor="onboarding-business-name">Business name</Label>
        <Input
          id="onboarding-business-name"
          placeholder="Acme Ltd"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
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
  loading,
  error,
}: {
  country: string;
  onCountryChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Money & location"
        title="Where do you invoice from?"
        subtitle="Sets your base currency and tax defaults. Both changeable later."
      />
      <div className="flex flex-col gap-4">
        {/* Stacked, not side by side: CurrencySelect shows the code AND the full
            name, and half of a 384px column can't hold "United Arab Emirates
            dirham". The pre-redesign form stacked these for the same reason. */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onboarding-country">Country</Label>
            <CountryDropdown
              value={country}
              onChange={(c) => onCountryChange(c.alpha2)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onboarding-currency">Base currency</Label>
            <CurrencySelect value={currency} onValueChange={onCurrencyChange} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="onboarding-email">Business email</Label>
          <Input
            id="onboarding-email"
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <NavRow
        onBack={onBack}
        primaryLabel={loading ? "Saving…" : "Continue"}
        onPrimary={onNext}
        primaryDisabled={email.trim().length === 0}
        primaryLoading={loading}
      />
    </div>
  );
}

// ─── 3. Make it yours ───────────────────────────────────────────────────────

function BrandStep({
  logoUrl,
  logoUploading,
  onPickLogo,
  businessName,
  taxId,
  onTaxIdChange,
  onBack,
  onSkip,
  onNext,
  loading,
  error,
}: {
  logoUrl: string | null;
  logoUploading: boolean;
  onPickLogo: () => void;
  businessName: string;
  taxId: string;
  onTaxIdChange: (value: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
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
          onClick={onPickLogo}
          disabled={logoUploading}
          className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-input p-4 text-muted-foreground transition-colors duration-200 [transition-timing-function:var(--ease-out)] fine-hover:border-foreground/40 fine-hover:text-foreground active:opacity-80"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : logoUploading ? (
            <span className="text-[11px]">Uploading…</span>
          ) : businessName.trim() ? (
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
          <Label htmlFor="onboarding-tax-id">Tax/VAT ID</Label>
          <Input
            id="onboarding-tax-id"
            placeholder="e.g. P051234567X"
            value={taxId}
            onChange={(e) => onTaxIdChange(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <NavRow
        onBack={onBack}
        secondaryLabel="Skip"
        onSecondary={onSkip}
        primaryLabel={loading ? "Saving…" : "Continue"}
        onPrimary={onNext}
        primaryLoading={loading}
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
  loading,
  error,
}: {
  invites: string[];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  onAddInvite: () => void;
  onRemoveInvite: (email: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
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
            <Label htmlFor="onboarding-invite-email">Email address</Label>
            <Input
              id="onboarding-invite-email"
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <NavRow
        onBack={onBack}
        primaryLabel={
          loading
            ? "Sending…"
            : invites.length === 0
              ? "Skip for now"
              : `Send ${invites.length} invite${invites.length === 1 ? "" : "s"}`
        }
        onPrimary={onNext}
        primaryLoading={loading}
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
  onFinish,
  finishing,
}: {
  businessName: string;
  currency: string;
  inviteCount: number;
  onFinish: () => void;
  finishing: boolean;
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
      <Button
        type="button"
        className="mt-8 w-full"
        onClick={onFinish}
        disabled={finishing}
      >
        {finishing ? "Taking you in…" : "Take me in"}
      </Button>
    </div>
  );
}

// ─── Flow ───────────────────────────────────────────────────────────────────

export function OnboardingOrgPage() {
  const navigate = useNavigate();
  const { user, profile, refreshOrg } = useAuth();

  const [step, setStep] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [country, setCountry] = useState("KE");
  const [businessError, setBusinessError] = useState("");
  const [businessSubmitting, setBusinessSubmitting] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [taxId, setTaxId] = useState("");
  const [brandError, setBrandError] = useState("");
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [invites, setInvites] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  const [finishing, setFinishing] = useState(false);

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadOrgLogo(orgId!, file);
      await updateOrg(orgId!, { logo_url: url });
      return url;
    },
    onSuccess: (url) => setLogoUrl(url),
    onError: (err) => {
      Sentry.captureException(err);
      toast.error("Failed to upload logo. Please try again.");
    },
  });

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !orgId) return;
    const prepared = await prepareLogoFile(file);
    if (!prepared.ok) {
      toast.error(prepared.error);
      return;
    }
    logoMutation.mutate(prepared.file);
  }

  // ── Step 1 → 2: create (or update) the org ────────────────────────────────

  async function createOrg(): Promise<string | null> {
    if (!user) return null;
    const newOrgId = crypto.randomUUID();

    const { error: orgError } = await supabase.from("organizations").insert({
      id: newOrgId,
      name: businessName.trim(),
      email: email.trim(),
      base_currency: currency,
      country_code: country,
    });

    if (orgError) {
      Sentry.captureException(orgError);
      setBusinessError("Failed to create your business. Please try again.");
      return null;
    }

    const memberError = await insertOwnerMembership(newOrgId, user.id);

    if (memberError) {
      Sentry.captureException(memberError);
      const { error: rbError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", newOrgId);
      if (rbError) {
        console.error(
          `Rollback failed for org ${newOrgId}: ${rbError.message}`,
        );
        Sentry.captureException(rbError, {
          extra: { context: "org_rollback_failed", orgId: newOrgId },
        });
      }
      setBusinessError("Failed to set up your account. Please try again.");
      return null;
    }

    // Always set active_org_id so the new org becomes the active one
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_org_id: newOrgId })
      .eq("id", user.id);
    if (updateError) {
      Sentry.captureException(updateError);
      const { error: rbMemberError } = await supabase
        .from("organization_members")
        .delete()
        .eq("org_id", newOrgId)
        .eq("user_id", user.id);
      if (rbMemberError) {
        console.error(
          `Rollback failed for membership org=${newOrgId} user=${user.id}: ${rbMemberError.message}`,
        );
        Sentry.captureException(rbMemberError, {
          extra: { context: "membership_rollback_failed", orgId: newOrgId },
        });
      }
      const { error: rbOrgError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", newOrgId);
      if (rbOrgError) {
        console.error(
          `Rollback failed for org ${newOrgId}: ${rbOrgError.message}`,
        );
        Sentry.captureException(rbOrgError, {
          extra: { context: "org_rollback_failed", orgId: newOrgId },
        });
      }
      setBusinessError("Failed to set up your account. Please try again.");
      return null;
    }

    // Seed system transaction categories — non-blocking, failure doesn't block onboarding
    const { error: seedError } = await supabase.rpc("seed_org_categories", {
      p_org_id: newOrgId,
    });
    if (seedError) {
      console.warn("Failed to seed transaction categories:", seedError.message);
      Sentry.captureException(seedError, {
        extra: { context: "seed_org_categories", orgId: newOrgId },
      });
    }

    // Seed system vault folders — non-blocking
    const { error: seedFoldersError } = await supabase.rpc(
      "seed_org_vault_folders",
      { p_org_id: newOrgId },
    );
    if (seedFoldersError) {
      console.warn("Failed to seed vault folders:", seedFoldersError.message);
      Sentry.captureException(seedFoldersError, {
        extra: { context: "seed_org_vault_folders", orgId: newOrgId },
      });
    }

    return newOrgId;
  }

  async function updateOrgBusinessDetails(
    existingOrgId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("organizations")
      .update({
        name: businessName.trim(),
        email: email.trim(),
        base_currency: currency,
        country_code: country,
      })
      .eq("id", existingOrgId);
    if (error) {
      Sentry.captureException(error);
      setBusinessError("Failed to update your business. Please try again.");
      return false;
    }
    return true;
  }

  async function handleLocationContinue() {
    if (!user) return;
    setBusinessError("");
    setBusinessSubmitting(true);
    try {
      if (orgId) {
        // Org already exists (user went back and is continuing again) — update it in place
        // rather than creating a second org.
        const ok = await updateOrgBusinessDetails(orgId);
        if (!ok) return;
        setStep(2);
        return;
      }

      const newOrgId = await createOrg();
      if (!newOrgId) return;
      setOrgId(newOrgId);

      // `?mode=create` (adding a second org) now runs the whole wizard too. The
      // old two-screen flow exited here because its only remaining screen was
      // invites; with five steps that would skip the logo and tax id, which a
      // second business needs just as much as its first. The auth context is
      // not refreshed until step 5, so the onboarding layout's "already has an
      // org" guard can't eject the user mid-wizard.
      setStep(2);
    } finally {
      setBusinessSubmitting(false);
    }
  }

  // ── Step 3: logo + tax id ──────────────────────────────────────────────────

  async function handleBrandContinue() {
    setBrandError("");
    if (!orgId) {
      setStep(3);
      return;
    }
    const trimmed = taxId.trim();
    if (!trimmed) {
      setStep(3);
      return;
    }
    setBrandSubmitting(true);
    try {
      await updateOrg(orgId, { tax_id: trimmed });
      setStep(3);
    } catch (err) {
      Sentry.captureException(err);
      setBrandError("Failed to save tax ID. Please try again.");
    } finally {
      setBrandSubmitting(false);
    }
  }

  function handleBrandSkip() {
    setBrandError("");
    setStep(3);
  }

  // ── Step 4: invites ────────────────────────────────────────────────────────

  const addInvite = () => {
    const value = inviteEmail.trim().toLowerCase();
    if (!value || invites.includes(value)) return;
    setInvites((prev) => [...prev, value]);
    setInviteEmail("");
  };

  const removeInvite = (email: string) =>
    setInvites((prev) => prev.filter((e) => e !== email));

  async function handleTeamContinue() {
    if (!orgId) return;
    if (invites.length === 0) {
      setStep(4);
      return;
    }

    setTeamError("");
    setTeamSubmitting(true);
    try {
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const rows = invites.map((inviteeEmail) => ({
        org_id: orgId,
        email: inviteeEmail,
        role: "member" as const,
        status: "invited" as const,
        expires_at: expiresAt,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("organization_members")
        .insert(rows)
        .select("id, email");

      if (insertError) {
        console.error("invite insert failed:", insertError);
        setTeamError("Couldn't add team members. Please try again.");
        return;
      }

      const inviterName = profile?.full_name || businessName || "";
      const invitations = (inserted ?? []).map((r) => ({
        email: r.email as string,
        id: r.id as string,
      }));
      const { error: inviteError } = await supabase.functions.invoke(
        "invite-member",
        { body: { invitations, inviterName } },
      );
      if (inviteError) {
        console.error("invite-member failed:", inviteError);
        // Non-fatal — members were inserted; proceed but warn.
        toast.warning(
          "Team members added, but invite emails failed to send. You can resend from Settings.",
        );
      }

      setStep(4);
    } finally {
      setTeamSubmitting(false);
    }
  }

  // ── Step 5: finish ─────────────────────────────────────────────────────────

  async function handleFinish() {
    setFinishing(true);
    try {
      await refreshOrg();
      navigate("/invoices");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <SplitLayout
      figure={
        <SetupFigure
          workspaceName={businessName}
          hasLogo={Boolean(logoUrl)}
          logoUrl={logoUrl}
          step={step}
        />
      }
      form={
        <div className="w-full max-w-sm">
          <Stepper step={step} total={STEP_COUNT} />

          {step === 0 && (
            <BusinessNameStep
              value={businessName}
              onChange={setBusinessName}
              onNext={() => setStep(1)}
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
              onNext={handleLocationContinue}
              loading={businessSubmitting}
              error={businessError}
            />
          )}

          {step === 2 && (
            <BrandStep
              logoUrl={logoUrl}
              logoUploading={logoMutation.isPending}
              onPickLogo={() => logoInputRef.current?.click()}
              businessName={businessName}
              taxId={taxId}
              onTaxIdChange={setTaxId}
              onBack={goBack}
              onSkip={handleBrandSkip}
              onNext={handleBrandContinue}
              loading={brandSubmitting}
              error={brandError}
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
              onNext={handleTeamContinue}
              loading={teamSubmitting}
              error={teamError}
            />
          )}

          {step === 4 && (
            <ReadyStep
              businessName={businessName}
              currency={currency}
              inviteCount={invites.length}
              onFinish={handleFinish}
              finishing={finishing}
            />
          )}

          <input
            ref={logoInputRef}
            type="file"
            accept={LOGO_ACCEPT}
            className="hidden"
            onChange={handleLogoFileChange}
          />
        </div>
      }
    />
  );
}
