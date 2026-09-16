import { cn } from "@travada-books/ui/lib/utils"

import { Grid, Slide, SlideHeader } from "./ui"

// Proposed pricing from PRICING-DISCUSSION.md §5 Option B — not finalized,
// pending Polar setup + BILLING-PLAN.md. Update once tiers are locked.
const TIERS = [
  {
    name: "Starter",
    price: "$15",
    founderPrice: "$10.50",
    blurb: "Freelancers and solo consultants.",
    badge: null,
  },
  {
    name: "Pro",
    price: "$35",
    founderPrice: "$24.50",
    blurb: "Small businesses and agencies.",
    badge: "Founder price locked",
  },
]

export function SectionSubscription() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow="How we'll make money" />

      <div className="mx-auto max-w-4xl">
        <span className="mb-6 block text-sm text-muted-foreground uppercase">Tiers</span>
        <div className="grid gap-6 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/60 px-8 py-10 text-center"
            >
              {tier.badge && (
                <span
                  className={cn(
                    "w-fit rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background uppercase"
                  )}
                >
                  {tier.badge}
                </span>
              )}
              <span className="text-base text-muted-foreground">{tier.name}</span>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-heading text-5xl font-medium text-foreground">
                  {tier.founderPrice}
                </span>
                <span className="text-sm text-muted-foreground line-through">{tier.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">{tier.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Not finalized — pending Polar setup. Founder pricing is locked
          permanently for every org that signs up before public launch. See
          PRICING-DISCUSSION.md.
        </p>
      </div>
    </Slide>
  )
}
