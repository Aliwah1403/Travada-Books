import { Badge } from "@travada-books/ui/components/badge"

import { Section } from "~/components/section"

const ITEMS = [
  {
    title: "eTIMS-ready invoicing",
  },
  {
    title: "Pay invoices by M-Pesa",
  },
]

// Visually a separate, quieter band — never adjacent to the invoicing
// section (§3), so "M-Pesa" here never reads as attached to invoicing.
export function ComingSoon() {
  return (
    <Section muted containerClassName="mx-auto max-w-[42rem] text-center">
      <p className="font-mono text-xs font-medium text-muted-foreground uppercase">Roadmap</p>
      <h2 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        Coming soon
      </h2>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-6"
          >
            <Badge variant="secondary">Coming soon</Badge>
            <span className="font-heading text-sm font-medium text-foreground">{item.title}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 font-heading text-sm text-muted-foreground">
        Start now and you'll already be set up when they arrive.
      </p>
    </Section>
  )
}
