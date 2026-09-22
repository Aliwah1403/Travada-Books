import { Button } from "@travada-books/ui/components/button";
import { cn } from "@travada-books/ui/lib/utils";
import {
  type Icon,
  Building01Icon,
  InboxIcon,
  Invoice01Icon,
  TickIcon,
  User02Icon,
  Wallet01Icon,
} from "@travada-books/ui/icons";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  to: string; // route that completes this item
  icon: Icon;
  done: boolean;
};

export const PLACEHOLDER_ITEMS: ChecklistItem[] = [
  {
    id: "business-profile",
    title: "Complete your business profile",
    description: "Add your logo and KRA PIN so they appear on every invoice.",
    to: "/settings/general",
    icon: Building01Icon,
    done: true,
  },
  {
    id: "first-customer",
    title: "Add your first customer",
    description: "Save their details once and reuse them on every document.",
    to: "/customers",
    icon: User02Icon,
    done: true,
  },
  {
    id: "first-invoice",
    title: "Send your first invoice",
    description: "Create it, send it, and track when it gets viewed.",
    to: "/invoices/create",
    icon: Invoice01Icon,
    done: false,
  },
  {
    id: "first-payment",
    title: "Record a payment",
    description: "Mark an invoice paid — part payments count too.",
    to: "/invoices",
    icon: Wallet01Icon,
    done: false,
  },
  {
    id: "connect-money-in",
    title: "Connect your inbox or import a statement",
    description: "Pull in receipts and bank records instead of typing them.",
    to: "/settings/integrations",
    icon: InboxIcon,
    done: false,
  },
];

type OnboardingChecklistProps = {
  items: ChecklistItem[];
  onToggleItem: (id: string) => void;
  onDismiss?: () => void;
};

export function OnboardingChecklist({
  items,
  onToggleItem,
  onDismiss,
}: OnboardingChecklistProps) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
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
        {items.map((item) => (
          <li key={item.id}>
            <button
              type='button'
              onClick={() => onToggleItem(item.id)}
              className='flex w-full items-start gap-3 px-4 py-3 text-left transition-colors fine-hover:bg-muted/50 active:opacity-80'
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  item.done
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "border border-muted-foreground/30",
                )}
              >
                {item.done && <TickIcon size={14} />}
              </span>

              <span className='min-w-0 flex-1'>
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.done && "text-muted-foreground line-through",
                  )}
                >
                  {item.title}
                </span>
                <span className='mt-0.5 block text-xs leading-snug text-muted-foreground'>
                  {item.description}
                </span>
              </span>

              <item.icon
                size={16}
                className='mt-0.5 shrink-0 text-muted-foreground/60'
              />
            </button>
          </li>
        ))}

        {allDone && (
          <li className='bg-muted/30 px-4 py-3 text-center'>
            <p className='text-sm'>You're all set up.</p>
            <Button variant='ghost' size='sm' className='mt-2' onClick={onDismiss}>
              Hide checklist
            </Button>
          </li>
        )}
      </ul>
    </div>
  );
}
