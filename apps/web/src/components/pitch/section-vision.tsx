import { Grid, Slide, SlideHeader } from "./ui"

export function SectionVision() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow="Vision" />

      <h2 className="max-w-4xl font-heading text-4xl font-medium tracking-tight text-foreground md:text-6xl">
        From invoicing tool to financial operating system for Kenyan
        businesses.
      </h2>

      <p className="mt-8 max-w-2xl text-base text-muted-foreground md:text-lg">
        "eTIMS-compliant + M-Pesa" is table stakes in this category, not a
        differentiator — every serious local competitor leads with it. We win
        on automation depth: the AI statement import, the recurring-invoice
        engine, the customer research nobody else runs. Compliance closes the
        gap; automation is the moat.
      </p>

      <p className="mt-4 max-w-2xl text-base font-medium text-foreground md:text-lg">
        Every business in Kenya keeping books in a notebook or a spreadsheet is
        a business we haven't reached yet.
      </p>
    </Slide>
  )
}
