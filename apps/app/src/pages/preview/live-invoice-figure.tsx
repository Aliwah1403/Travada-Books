import { cn } from "@travada-books/ui/lib/utils";

/**
 * ── Live invoice figure ─────────────────────────────────────────────────────
 *
 * Left panel of the onboarding-split playground. Concept: instead of a
 * decorative visual (the reference used a particle field), render an actual
 * invoice that assembles itself from what the user types across the five
 * steps. Every field onboarding asks for visibly lands somewhere on this
 * document — business name + email in the header, currency in every total,
 * the logo tile, the tax id in the footer, team size in a small note. Fields
 * not filled in yet render as muted placeholder bars (see `AssembledText`)
 * so the invoice always holds its shape and visibly *fills in* as the user
 * progresses, instead of the layout jumping around.
 *
 * `step` lightly tints whichever section of the invoice the current
 * onboarding step feeds, using colour only (no motion) — a small, honest
 * "this is what that field is for" cue.
 *
 * To restyle the invoice itself, edit SAMPLE_CUSTOMER / LINE_ITEMS below.
 */

export interface LiveInvoiceFigureProps {
  businessName: string;
  email: string;
  currency: string;
  countryName: string;
  taxId: string;
  hasLogo: boolean;
  inviteCount: number;
  step: number;
}

const SAMPLE_CUSTOMER = {
  name: "Savannah Traders Ltd",
  location: "Nairobi, Kenya",
};

const LINE_ITEMS = [
  { description: "Monthly bookkeeping", amount: 45000 },
  { description: "VAT filing — Feb", amount: 12000 },
  { description: "Statement reconciliation", amount: 8500 },
];

const VAT_RATE = 0.16;

const FADE =
  "transition-opacity duration-200 [transition-timing-function:var(--ease-out)]";
const TINT =
  "transition-colors duration-200 [transition-timing-function:var(--ease-out)]";

/** Crossfades between the real value and a placeholder bar of similar width,
 * so a field filling in never changes the invoice's layout. */
function AssembledText({
  value,
  placeholderWidth,
  className,
}: {
  value: string;
  placeholderWidth: string;
  className?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <span className="grid">
      <span
        className={cn(
          "col-start-1 row-start-1 truncate",
          FADE,
          filled ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        {value || " "}
      </span>
      <span
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 flex items-center",
          FADE,
          filled ? "opacity-0" : "opacity-100",
        )}
      >
        <span className={cn("h-3 rounded bg-foreground/10", placeholderWidth)} />
      </span>
    </span>
  );
}

export function LiveInvoiceFigure({
  businessName,
  email,
  currency,
  countryName,
  taxId,
  hasLogo,
  inviteCount,
  step,
}: LiveInvoiceFigureProps) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "KES",
    currencyDisplay: "narrowSymbol",
  });

  const subtotal = LINE_ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const initial = businessName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-muted/30 p-10">
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl"
        style={{ transform: "rotate(-2deg)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                TINT,
                step === 2 && "ring-1 ring-primary/30",
                hasLogo
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "-mx-1.5 -my-0.5 rounded px-1.5 py-0.5",
                  TINT,
                  step === 0 && "bg-primary/5",
                )}
              >
                <AssembledText
                  value={businessName}
                  placeholderWidth="w-28"
                  className="text-sm font-semibold text-foreground"
                />
              </div>
              <AssembledText
                value={email}
                placeholderWidth="w-32"
                className="mt-1 text-xs text-muted-foreground"
              />
              <AssembledText
                value={countryName}
                placeholderWidth="w-20"
                className="mt-1 text-[11px] text-muted-foreground"
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Invoice
            </p>
            <p className="font-mono text-xs text-foreground">INV-0001</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Bill to
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {SAMPLE_CUSTOMER.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {SAMPLE_CUSTOMER.location}
          </p>
        </div>

        {/* Line items */}
        <div className="mt-6 flex flex-col gap-2 border-t pt-3">
          {LINE_ITEMS.map((item) => (
            <div
              key={item.description}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground">{item.description}</span>
              <span className={cn("font-mono text-foreground", TINT)}>
                {formatter.format(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div
          className={cn(
            "-mx-2 mt-4 rounded-md border-t px-2 pt-3",
            TINT,
            step === 1 && "bg-primary/5",
          )}
        >
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatter.format(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>VAT (16%)</span>
              <span className="font-mono">{formatter.format(vat)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 text-sm font-semibold text-foreground">
              <span>Total</span>
              <span className="font-mono">{formatter.format(total)}</span>
            </div>
          </div>
        </div>

        {/* Team note — only once there's someone to share the invoice with */}
        {inviteCount > 0 && (
          <div
            className={cn(
              "-mx-2 mt-4 rounded-md px-2 py-1.5 animate-in fade-in-0 duration-200",
              "[animation-timing-function:var(--ease-out)]",
              TINT,
              step === 3 && "bg-primary/5",
            )}
          >
            <p className="text-[11px] text-muted-foreground">
              Visible to {inviteCount + 1} team member
              {inviteCount === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {/* Footer */}
        {taxId.trim().length > 0 && (
          <div
            className={cn(
              "-mx-2 mt-4 rounded-md border-t px-2 pt-3 animate-in fade-in-0 duration-200",
              "[animation-timing-function:var(--ease-out)]",
              TINT,
              step === 2 && "bg-primary/5",
            )}
          >
            <p className="text-[10px] text-muted-foreground">Tax ID: {taxId}</p>
          </div>
        )}
      </div>

      <div className="max-w-xs text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          What you&apos;re setting up
        </p>
        <p className="mt-2 font-heading text-lg text-foreground">
          Every invoice you send carries these details.
        </p>
      </div>
    </div>
  );
}
