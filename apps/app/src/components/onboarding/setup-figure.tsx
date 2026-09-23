import { ArrowLeft01Icon, PlusSignIcon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { zoomStyle, type ZoomTarget } from "./zoom";

/**
 * ── Dashboard figure ────────────────────────────────────────────────────────
 *
 * A hand-port of the DashboardIllustration from the @shadcnblocks/onboarding1
 * block: a wireframe of the app you're setting up — sidebar, toolbar, table —
 * that the camera pushes into as the form fills.
 *
 * Ported rather than installed: that block lists button, dialog, input, label,
 * select, switch, table and textarea as registryDependencies, which would have
 * overwritten eight of our primitives, and pulls in lucide-react and Framer
 * Motion. Lucide's ChevronLeft/Plus are hugeicons here, the wireframe table is
 * plain divs (an empty <table> is worse for assistive tech than a div grid),
 * and the whole figure is aria-hidden because it is decoration.
 *
 * Deliberately wider than its panel — the panel clips it. That overflow is
 * what makes a close-up framed from outside the corners read as a push-in
 * rather than a crop.
 */

// Two scales only, alternating — 1 for the wide shot and ~1.5 for a push-in,
// which is exactly what the reference does. The alternation IS the effect: a
// close-up only registers as one if you pulled wide first. The two close
// framings reuse the block's own origins, `-20% -10%` and `180% -10%`.
const ZOOM: Record<number, ZoomTarget> = {
  0: { scale: 1.5, focus: [-0.2, -0.1] }, // name -> workspace tile, top-left
  1: { scale: 1, focus: [0.5, 0.5] }, // currency -> pull wide
  2: { scale: 1.5, focus: [-0.2, -0.1] }, // logo -> back into the same tile
  3: { scale: 1, focus: [0.5, 0.5] }, // invites -> pull wide
  4: { scale: 1.35, focus: [1.8, -0.1] }, // ready -> top-right of the workspace
};

type SetupFigureProps = {
  workspaceName: string;
  hasLogo: boolean;
  /**
   * The uploaded logo. When present it replaces the initial in the workspace
   * tile. Optional because the playground drives this figure with a fake
   * `hasLogo` and no real upload.
   */
  logoUrl?: string | null;
  step: number;
};

export function SetupFigure({
  workspaceName,
  hasLogo,
  logoUrl,
  step,
}: SetupFigureProps) {
  const target = ZOOM[step] ?? ZOOM[4];
  const initial = workspaceName.trim().charAt(0).toUpperCase();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-10">
      <div
        aria-hidden
        className="h-[34rem] w-[64rem] shrink-0 transition-transform duration-500"
        style={zoomStyle(target)}
      >
        <div className="flex h-full w-full overflow-hidden rounded-xl border bg-background">
          {/* Sidebar */}
          <div
            className="h-full shrink-0 overflow-hidden border-r bg-muted"
            style={{ flexBasis: "28.5%" }}
          >
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <div className="flex items-center gap-2 overflow-hidden">
                {logoUrl ? (
                  // Height-locked, width free, so a wide wordmark keeps its
                  // proportions instead of shrinking to fit a square. Capped so
                  // the workspace name beside it still gets room.
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-8 w-auto max-w-24 shrink-0 object-contain animate-in fade-in-0 zoom-in-95 duration-200 [animation-timing-function:var(--ease-out)]"
                  />
                ) : (
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-semibold transition-colors duration-200",
                      hasLogo
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/15 text-foreground/50",
                    )}
                  >
                    {initial}
                  </div>
                )}
                {workspaceName.trim() ? (
                  <p className="truncate font-semibold">{workspaceName}</p>
                ) : (
                  <span className="h-4 w-28 rounded bg-foreground/10" />
                )}
              </div>
              <ArrowLeft01Icon size={16} className="shrink-0 opacity-60" />
            </div>

            <ul className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <li
                  key={`nav-${i}`}
                  className="h-9 rounded-lg border bg-background/50"
                />
              ))}
            </ul>
          </div>

          {/* Main */}
          <div
            className="flex shrink-0 flex-col justify-between p-4"
            style={{ flexBasis: "71.5%" }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-9 rounded-lg border bg-muted/50" />
                  <div className="h-9 w-64 rounded-lg border bg-muted/50" />
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={`tool-${i}`}
                        className="size-9 rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex h-9 items-center gap-2 rounded-lg border px-3">
                  <span className="block h-5 w-20 rounded-md bg-muted/50" />
                  <PlusSignIcon size={14} className="opacity-60" />
                </div>
              </div>

              {/* Wireframe table */}
              <div className="overflow-hidden rounded-lg border">
                <div className="flex bg-muted/50">
                  {[10, 40, 30, 60].map((width, i) => (
                    <div
                      key={`th-${i}`}
                      className="h-9 border-r last:border-r-0"
                      style={{ flex: width }}
                    />
                  ))}
                </div>
                {Array.from({ length: 8 }).map((_, row) => (
                  <div
                    key={`row-${row}`}
                    className={cn("flex border-t", row % 2 === 1 && "bg-muted/20")}
                  >
                    {[10, 40, 30, 60].map((width, col) => (
                      <div
                        key={`cell-${row}-${col}`}
                        className="h-9 border-r last:border-r-0"
                        style={{ flex: width }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`foot-${i}`}
                  className="size-9 rounded-lg border bg-muted/50"
                />
              ))}
            </div>
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
            What you&apos;re setting up
          </p>
          <p className="mt-2 font-heading text-lg text-foreground">
            Your workspace, ready the moment you step in.
          </p>
        </div>
      </div>
    </div>
  );
}
