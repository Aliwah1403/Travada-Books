import { Link } from "react-router";
import { Button } from "@travada-books/ui/components/button";
import { cn } from "@travada-books/ui/lib/utils";
import {
  type Icon,
  Building01Icon,
  Invoice01Icon,
  TickIcon,
  User02Icon,
  Wallet01Icon,
} from "@travada-books/ui/icons";
import type { OnboardingChecklistStatus } from "@/lib/queries/onboarding";

export type ChecklistStep = {
  id: keyof OnboardingChecklistStatus;
  title: string;
  description: string;
  to: string; // route that completes this step
  icon: Icon;
};

export const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: "business_profile",
    title: "Set up your business",
    description: "Your name and contact email appear on every invoice.",
    to: "/settings/general",
    icon: Building01Icon,
  },
  {
    id: "first_customer",
    title: "Add your first customer",
    description: "Save their details once and reuse them on every document.",
    to: "/customers",
    icon: User02Icon,
  },
  {
    id: "first_invoice",
    title: "Send your first invoice",
    description: "Create it, send it, and track when it gets viewed.",
    to: "/invoices/create",
    icon: Invoice01Icon,
  },
  {
    id: "first_payment",
    title: "Record a payment",
    description: "Mark an invoice paid — part payments count too.",
    to: "/invoices",
    icon: Wallet01Icon,
  },
  {
    id: "first_expense",
    title: "Record your first expense",
    description: "Start tracking money out, not just money in.",
    to: "/transactions",
    icon: Wallet01Icon,
  },
];

type OnboardingChecklistProps = {
  status: OnboardingChecklistStatus;
  onNavigate: () => void;
  onDismiss?: () => void;
};

export function OnboardingChecklist({
  status,
  onNavigate,
  onDismiss,
}: OnboardingChecklistProps) {
  const total = CHECKLIST_STEPS.length;
  const done = CHECKLIST_STEPS.filter((step) => status[step.id]).length;
  const allDone = total > 0 && done === total;

  return (
    <div>
      <div className='px-4 py-3'>
        <p className='text-sm font-medium'>Get set up</p>
        <p className='font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase'>
          {done} of {total} complete
        </p>
      </div>

      <ul className='divide-y border-t'>
        {CHECKLIST_STEPS.map((step) => {
          const isDone = status[step.id];
          return (
            <li key={step.id}>
              <Link
                to={step.to}
                onClick={onNavigate}
                className='flex w-full items-start gap-3 px-4 py-3 text-left transition-colors fine-hover:bg-muted/50 active:opacity-80'
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                    isDone
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "border border-muted-foreground/30",
                  )}
                >
                  {isDone && <TickIcon size={14} />}
                </span>

                <span className='min-w-0 flex-1'>
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                  </span>
                  <span className='mt-0.5 block text-xs leading-snug text-muted-foreground'>
                    {step.description}
                  </span>
                </span>

                <step.icon
                  size={16}
                  className='mt-0.5 shrink-0 text-muted-foreground/60'
                />
              </Link>
            </li>
          );
        })}

        {allDone && (
          <li className='bg-muted/30 px-4 py-3 text-center'>
            <p className='text-sm'>You're all set up.</p>
            <Button variant='ghost' size='sm' className='mt-2' onClick={onDismiss}>
              Hide checklist
            </Button>
          </li>
        )}
      </ul>

      {!allDone && (
        <div className='border-t px-2 py-1.5 text-center'>
          <Button
            variant='ghost'
            size='sm'
            className='text-muted-foreground'
            onClick={onDismiss}
          >
            Skip for now
          </Button>
        </div>
      )}
    </div>
  );
}
