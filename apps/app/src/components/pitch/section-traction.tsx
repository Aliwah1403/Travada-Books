import { Panel, Grid, Slide, SlideHeader } from "./ui"

const STATS = [
  ["2026-07-02", "Beta launched (Transactions + Vault)"],
  ["19", "invoices created in the first 30 days"],
  ["22", "quotes created in the first 30 days"],
  ["9", "customers onboarded in the first 30 days"],
]

export function SectionTraction() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow="Traction" />

      <h2 className="max-w-3xl font-heading text-4xl font-medium tracking-tight text-foreground md:text-6xl">
        Early. Real. Ours to build on.
      </h2>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
        We're a few weeks into private beta — small numbers, honestly reported.
        {/* TODO: refresh these once billing + public launch ship — see PRICING-DISCUSSION.md §1 */}
      </p>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(([value, label]) => (
          <Panel key={label} className="items-center text-center">
            <span className="font-heading text-4xl font-medium text-foreground md:text-5xl">
              {value}
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </Panel>
        ))}
      </div>
    </Slide>
  )
}
