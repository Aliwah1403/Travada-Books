import { CheckmarkCircle01Icon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { zoomStyle, type ZoomTarget } from "./zoom";

/**
 * ── Auth figure ──────────────────────────────────────────────────────────────
 *
 * Why this graphic differs in kind from dashboard-figure.tsx: that figure is
 * fed by the form — type a business name and it appears on the workspace
 * tile, so the wide shot is deliberately blank and fills in as you go. Auth
 * has nothing to feed it. An email and a password can't be shown on screen,
 * and there's no workspace yet to preview. A form-fed figure here would just
 * sit empty through all three screens.
 *
 * So this one is self-contained and complete from the first frame — it shows
 * what's behind the door rather than what you're building: a reconciled
 * ledger, already sorted, already matched. The only thing that changes
 * between signin/signup/verify is where the camera looks.
 *
 * Static by design — no looping, no auto-advancing rows. This is a screen
 * people hit dozens of times a day (CLAUDE.md's frequency test), and a
 * login screen that animates forever is a distraction and a battery drain.
 * The only motion is the camera move between screens, same shared zoom
 * mechanics as dashboard-figure.tsx (see ./zoom).
 */

type Screen = "signin" | "signup" | "verify";

type Transaction = {
  date: string;
  name: string;
  ref: string;
  category: string;
  amount: number;
  matched?: boolean;
};

const TRANSACTIONS: Transaction[] = [
  { date: "Sep 20", name: "Naivas Supermarket", ref: "SJ41K2M9X0", category: "Stock", amount: -4250 },
  { date: "Sep 19", name: "Savannah Traders Ltd", ref: "QK92P0L4T7", category: "Client payment", amount: 86000, matched: true },
  { date: "Sep 19", name: "KPLC Prepaid", ref: "RH03M8N2W5", category: "Utilities", amount: -3120 },
  { date: "Sep 18", name: "Safaricom Data", ref: "TL77J5K1V9", category: "Airtime", amount: -1000 },
  { date: "Sep 17", name: "Jomo Traders", ref: "DP48Q3R6X2", category: "Client payment", amount: 42500, matched: true },
  { date: "Sep 16", name: "Java House", ref: "MN15W9E3Y8", category: "Meals", amount: -1850 },
  { date: "Sep 15", name: "Kenya Power & Lighting", ref: "BC62T4U0Z1", category: "Utilities", amount: -5400 },
  { date: "Sep 14", name: "Amref Health Africa", ref: "XJ90H7G2S6", category: "Client payment", amount: 128000, matched: true },
  { date: "Sep 13", name: "Uber Kenya", ref: "FW38K6L0D4", category: "Transport", amount: -640 },
];

const RUNNING_BALANCE = TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0);

const KES_BASE = {
  style: "currency",
  currency: "KES",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
} as const;

/** Movements carry a sign — money in or out. */
function formatKES(value: number) {
  return new Intl.NumberFormat("en-US", {
    ...KES_BASE,
    signDisplay: "exceptZero",
  }).format(value);
}

/** A balance does not. "+KES 186,000" reads as a movement, not a position. */
function formatBalance(value: number) {
  return new Intl.NumberFormat("en-US", KES_BASE).format(value);
}

// Wide shot (signin), a push-in on a matched row (signup), and a tight crop
// on the reference-code column (verify) — see the per-screen rationale
// below. Focus values are tuned against the ledger's own layout: the
// reference column sits ~35% across the card, and the matched rows land at
// roughly y 0.28 / 0.53 / 0.78 given the header + 9 rows at this scale.
const ZOOM: Record<Screen, ZoomTarget> = {
  // Your books, whole and waiting — no push-in, nothing hidden.
  signin: { scale: 1, focus: [0.5, 0.5] },
  // What you'd be getting: centred on "Jomo Traders", the middle of the
  // three matched rows, so the Matched chip reads clearly in frame.
  signup: { scale: 1.45, focus: [0.6, 0.53] },
  // Tight on the reference-code column. Deliberate rhyme: the user is
  // typing a code into the OTP inputs, and the figure is showing codes.
  verify: { scale: 1.6, focus: [0.35, 0.3] },
};

function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit items-center truncate rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

function MatchedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <CheckmarkCircle01Icon size={10} />
      Matched
    </span>
  );
}

type AuthFigureProps = {
  screen: Screen;
};

export function AuthFigure({ screen }: AuthFigureProps) {
  const target = ZOOM[screen];

  return (
    <div
      aria-hidden
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-10"
    >
      <div
        className="h-[30rem] w-[58rem] shrink-0 transition-transform duration-500"
        style={zoomStyle(target)}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background">
          {/* Header strip */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <p className="font-heading text-lg text-foreground">Transactions</p>
            <div className="flex flex-col items-end gap-0.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Sep 13 – Sep 20
              </p>
              <p className="font-heading text-lg text-foreground tabular-nums">
                {formatBalance(RUNNING_BALANCE)}
              </p>
            </div>
          </div>

          {/* Rows */}
          <div className="flex-1 divide-y overflow-hidden">
            {TRANSACTIONS.map((t) => (
              <div
                key={t.ref}
                className="flex items-center gap-4 px-6 py-3"
              >
                <span className="w-14 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {t.date}
                </span>
                <span className="w-40 shrink-0 truncate text-xs font-medium text-foreground">
                  {t.name}
                </span>
                <span className="w-28 shrink-0 truncate font-mono text-[10px] text-muted-foreground/70">
                  {t.ref}
                </span>
                <span className="w-24 shrink-0">
                  <CategoryChip label={t.category} />
                </span>
                <span className="w-20 shrink-0">
                  {t.matched && <MatchedChip />}
                </span>
                <span
                  className={cn(
                    "flex-1 text-right text-xs font-medium tabular-nums",
                    t.amount > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-foreground",
                  )}
                >
                  {formatKES(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Softens the crop, and gives the caption a ground to sit on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 40%, color-mix(in srgb, var(--muted) 92%, transparent) 92%)",
        }}
      />

      {/* Pinned, not a flex sibling: scale() doesn't affect layout, so a
          caption in normal flow gets covered by the zoomed figure. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-10">
        <div className="max-w-xs text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Inside Travada Books
          </p>
          <p className="mt-2 font-heading text-lg text-foreground">
            Every shilling in and out, already sorted.
          </p>
        </div>
      </div>
    </div>
  );
}
