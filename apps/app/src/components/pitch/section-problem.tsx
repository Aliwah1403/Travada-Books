import {
  Invoice01Icon,
  Globe02Icon,
  Timer01Icon,
} from "@travada-books/ui/icons";

import { FeatureCard, Grid, Slide, SlideHeader } from "./ui";

import ReceiptImage from "./scrambled-receipts.jpeg";

export function SectionProblem() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow='Problem' />

      <div className='mx-auto grid max-w-7xl gap-6 md:grid-cols-3'>
        <div className='flex flex-col items-center gap-6 text-center'>
          <FeatureCard
            icon={<Invoice01Icon />}
            title='Disorganization'
            description='The record of who has actually paid you is in your head, a notebook, or a WhatsApp thread from March.'
          />
          <h2 className='font-heading text-4xl font-medium tracking-tight text-foreground md:text-5xl'>
            The current way of doing books doesn't fit how Kenyan businesses
            actually work.
          </h2>
        </div>

        <img
          src={ReceiptImage}
          alt='Illustration: a mess of receipts / crumpled invoice'
          className='min-h-80 w-full rounded-lg object-cover md:min-h-full'
        />

        <div className='flex flex-col items-center gap-6 text-center'>
          <FeatureCard
            icon={<Globe02Icon />}
            title='Scattered everywhere'
            description='M-Pesa, bank, cash, notebook — the numbers live in five places and agree with none of them.'
          />
          <FeatureCard
            icon={<Timer01Icon />}
            title='Built for accountants, not owners'
            description='Existing tools prioritize compliance features over a simple, fast way to send an invoice and get paid.'
          />
        </div>
      </div>
    </Slide>
  );
}
