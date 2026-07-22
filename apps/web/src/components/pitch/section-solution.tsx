import {
  RepeatIcon,
  ReceiptTextIcon,
  SparklesIcon,
} from "@travada-books/ui/icons";

import { FeatureCard, Grid, Slide, SlideHeader } from "./ui";

import DashboardImage from "./dashboard-screenshot.png";

export function SectionSolution() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow='Solution' />

      <div className='mx-auto flex max-w-7xl flex-col gap-6 md:flex-row'>
        <div className='grid gap-6 md:w-3/5 md:grid-cols-2'>
          <FeatureCard
            icon={<RepeatIcon />}
            title='The invoicing does itself'
            description='Recurring invoices, scheduled sending, auto reminders, quotes that become invoices on acceptance.'
          />

          <h2 className='flex items-center justify-center text-center font-heading text-3xl font-medium tracking-tight text-foreground md:text-4xl'>
            We turn a month of paperwork into one upload.
          </h2>

          <FeatureCard
            icon={<ReceiptTextIcon />}
            title='The bookkeeping does itself'
            description='Drop in a bank or M-Pesa statement, CSV or PDF — a year of transactions, categorised, in about a minute.'
          />

          <FeatureCard
            icon={<SparklesIcon />}
            title='AI that actually helps'
            description='Customer profiles fill themselves in. Receipts file and match themselves. Search in plain English.'
          />
        </div>

        <img
          src={DashboardImage}
          alt='Travada Books Dashboard Illustration'
          className='min-h-80 w-full rounded-lg object-cover md:w-2/5'
        />
      </div>
    </Slide>
  );
}
