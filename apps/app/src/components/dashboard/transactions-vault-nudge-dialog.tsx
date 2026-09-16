import { useNavigate } from "react-router";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import { Button } from "@travada-books/ui/components/button";
import {
  Wallet01Icon,
  VaultIcon,
  ArrowRight01Icon,
} from "@travada-books/ui/icons";

type TransactionsVaultNudgeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const features = [
  {
    icon: Wallet01Icon,
    title: "Transactions",
    description:
      "Import a bank statement or drag in a receipt — Travada Books categorizes it automatically so you always know your income and expenses.",
    href: "/transactions",
    cta: "Import a statement",
  },
  {
    icon: VaultIcon,
    title: "Vault",
    description:
      "Secure storage for every company document — contracts, receipts, licenses, statements, and more. Upload a file and it's sorted and labeled for you, ready to share with a secure link.",
    href: "/vault",
    cta: "Upload a document",
  },
];

export function TransactionsVaultNudgeDialog({
  open,
  onOpenChange,
}: TransactionsVaultNudgeDialogProps) {
  const navigate = useNavigate();

  function handleNavigate(href: string) {
    onOpenChange(false);
    navigate(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='md:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Two features worth a look</DialogTitle>
          <DialogDescription>
            You've been invoicing with us for a while — here are two tools
            already in your account that can save you time.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          {features.map(({ icon: Icon, title, description, href, cta }) => (
            <div
              key={title}
              className='flex flex-col gap-2 rounded-lg border border-border p-3'
            >
              <div className='flex items-center gap-2'>
                <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-muted'>
                  <Icon className='size-3.5' strokeWidth={2} />
                </span>
                <p className='text-sm font-medium'>{title}</p>
              </div>
              <p className='text-xs/relaxed text-muted-foreground'>
                {description}
              </p>
              <Button className='w-fit' onClick={() => handleNavigate(href)}>
                {cta}
                <ArrowRight01Icon data-icon='inline-end' strokeWidth={2} />
              </Button>
            </div>
          ))}
        </div>

        <div className='flex justify-end'>
          <DialogClose render={<Button variant='ghost' size='sm' />}>
            Maybe later
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
