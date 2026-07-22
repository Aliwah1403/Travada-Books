import { AiChat01Icon, BankIcon, type Icon } from "@travada-books/ui/icons";

import {
  GoogleIcon,
  OutlookIcon,
  StripeIcon,
  WhatsappIcon,
} from "./brand-icons";
import MpesaLogo from "./Mpesa-Logo.png";
import { Grid, Slide, SlideHeader } from "./ui";

function LogoBadge({ icon: IconComponent }: { icon: Icon }) {
  return (
    <span className='flex size-9 items-center justify-center rounded-full border border-border bg-background'>
      <IconComponent size={16} className='text-foreground' />
    </span>
  );
}

function MPesaBadge() {
  return (
    <span className='flex h-9 items-center rounded-full border border-border bg-background px-3'>
      <img src={MpesaLogo} alt="M-Pesa" className='h-4 w-auto object-contain' />
    </span>
  );
}

// Dashed convergence lines from 3 evenly-spaced sources down to one point.
function ConvergeThree() {
  return (
    <svg
      viewBox='0 0 124 26'
      className='h-6 w-[124px] text-muted-foreground/50'
      fill='none'
    >
      <path
        d='M18 0C18 13 40 13 62 26'
        stroke='currentColor'
        strokeDasharray='3 3'
      />
      <path d='M62 0V26' stroke='currentColor' strokeDasharray='3 3' />
      <path
        d='M106 0C106 13 84 13 62 26'
        stroke='currentColor'
        strokeDasharray='3 3'
      />
    </svg>
  );
}

// Dashed convergence lines from 2 sources down to one point.
function ConvergeTwo() {
  return (
    <svg
      viewBox='0 0 80 26'
      className='h-6 w-20 text-muted-foreground/50'
      fill='none'
    >
      <path
        d='M18 0C18 13 30 13 40 26'
        stroke='currentColor'
        strokeDasharray='3 3'
      />
      <path
        d='M62 0C62 13 50 13 40 26'
        stroke='currentColor'
        strokeDasharray='3 3'
      />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className='absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground'>
      <svg viewBox='0 0 24 24' className='size-2.5 text-background' fill='none'>
        <path
          d='M5 13l4 4L19 7'
          stroke='currentColor'
          strokeWidth='2.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  );
}

function AssistantIllustration() {
  return (
    <div className='flex w-full flex-col items-center gap-1'>
      <div className='flex items-center gap-2'>
        <LogoBadge icon={WhatsappIcon} />
        <LogoBadge icon={GoogleIcon} />
        <LogoBadge icon={OutlookIcon} />
      </div>
      <ConvergeThree />
      <div className='flex w-full max-w-[220px] items-start gap-2 rounded-lg border border-foreground/30 bg-background px-3 py-2.5 text-left'>
        <AiChat01Icon size={16} className='mt-0.5 shrink-0 text-foreground' />
        <span className='text-xs text-muted-foreground'>
          "Which invoices are overdue?"
        </span>
      </div>
    </div>
  );
}

function SyncIllustration() {
  return (
    <div className='flex w-full flex-col items-center gap-1'>
      <div className='flex items-center gap-2'>
        <LogoBadge icon={BankIcon} />
        <MPesaBadge />
      </div>
      <ConvergeTwo />
      <div className='relative flex w-full max-w-[200px] flex-col gap-2 rounded-md border border-foreground/30 bg-background px-4 py-3 text-left'>
        <div className='flex items-center justify-between gap-2'>
          <div className='h-2 w-16 rounded-full bg-foreground/15' />
          <div className='h-2 w-10 rounded-full bg-foreground/25' />
        </div>
        <div className='flex items-center justify-between gap-2'>
          <div className='h-2 w-20 rounded-full bg-foreground/15' />
          <div className='h-2 w-8 rounded-full bg-foreground/25' />
        </div>
        <CheckBadge />
      </div>
    </div>
  );
}

function PaymentsIllustration() {
  return (
    <div className='flex w-full flex-col items-center gap-1'>
      <div className='flex items-center gap-2'>
        <LogoBadge icon={StripeIcon} />
        <MPesaBadge />
      </div>
      <ConvergeTwo />
      <div className='relative flex w-full max-w-[200px] flex-col gap-2 rounded-md border border-foreground/30 bg-background px-4 py-3 text-left'>
        <div className='h-2 w-3/4 rounded-full bg-foreground/15' />
        <div className='h-2 w-1/2 rounded-full bg-foreground/10' />
        <div className='mt-1 flex items-center justify-between'>
          <span className='text-xs font-medium text-foreground'>Pay now</span>
          <div className='flex items-center gap-1.5'>
            <StripeIcon size={14} className='text-foreground' />
            <img
              src={MpesaLogo}
              alt="M-Pesa"
              className='h-3 w-auto object-contain'
            />
          </div>
        </div>
        <CheckBadge />
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "Ask your books anything",
    description:
      "The AI assistant meets you where you already work — WhatsApp, Gmail, or Outlook. Ask about unpaid invoices, cash flow, or a customer in plain language.",
    illustration: <AssistantIllustration />,
  },
  {
    title: "Bank & M-Pesa sync",
    description:
      "Read-only transaction sync from your bank and M-Pesa — turns Travada from an invoicing tool into a real financial operations tool.",
    illustration: <SyncIllustration />,
  },
  {
    title: "Get paid on the invoice",
    description:
      "Customers pay directly from the invoice via M-Pesa STK push or Stripe — no more chasing bank transfers.",
    illustration: <PaymentsIllustration />,
  },
];

export function SectionNext() {
  return (
    <Slide>
      <Grid />
      <SlideHeader eyebrow="What's coming next" />

      <div className='mx-auto grid max-w-6xl gap-6 md:grid-cols-3'>
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className='flex flex-col items-center gap-6 rounded-lg border border-border bg-card/60 px-8 py-10 text-center'
          >
            {feature.illustration}
            <div className='flex flex-col items-center gap-2'>
              <span className='text-base font-medium text-foreground md:text-lg'>
                {feature.title}
              </span>
              <p className='text-sm text-muted-foreground'>
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}
