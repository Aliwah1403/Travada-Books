import { Grid, ImagePlaceholder, Slide, SlideHeader } from "./ui";

const DIFFERENTIATORS = [
  [
    "Inbox",
    "Forward a receipt — AI extracts amount, date, merchant, tax, matches it to a transaction, and files it. No manual entry.",
  ],
  [
    "Statement import",
    "A full month of transactions, categorised, in about ten seconds. Handles split debit/credit column formats too.",
  ],
  [
    "Customer AI enrichment",
    "Type a name and email — industry, company type, HQ, and socials fill themselves in, live.",
  ],
  [
    "Vault",
    "Drag in a document — it auto-tags, summarises, and titles itself. Pull a receipt straight into a transaction.",
  ],
  [
    "Natural-language search",
    '"Unpaid invoices over 100k from last month for Acme" — no filter dropdowns.',
  ],
  [
    "Customisable dashboard",
    "Drag widgets in and out — cash flow, burn rate, overdue invoices. Every teammate can lay it out differently.",
  ],
];

export function SectionDemo() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow='Demo' />

      <h2 className='max-w-3xl font-heading text-4xl font-medium tracking-tight text-foreground md:text-6xl'>
        Most people only see "an invoicing tool."
      </h2>
      <p className='mt-4 max-w-2xl text-base text-muted-foreground md:text-lg'>
        A lot of what's built is invisible until someone stumbles onto it.
      </p>

      <video
        about='Travada Books product walkthrough'
        src='https://res.cloudinary.com/dzycxaapd/video/upload/v1784719177/Travada_Books_Beta_v0.5_nbvbcb.mov'
        controls
        muted
        className='mx-auto mt-10 aspect-video w-full max-w-5xl'
      />

      <ul className='mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {DIFFERENTIATORS.map(([title, desc]) => (
          <li
            key={title}
            className='rounded-lg border border-border bg-card/60 px-6 py-5 text-center'
          >
            <p className='text-base font-medium text-foreground'>{title}</p>
            <p className='mt-2 text-sm text-muted-foreground'>{desc}</p>
          </li>
        ))}
      </ul>
    </Slide>
  );
}
