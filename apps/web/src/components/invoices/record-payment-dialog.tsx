import { useState } from "react";
import { toast } from "sonner";
import { Alert02Icon, Wallet01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Label } from "@travada-books/ui/components/label";
import { Input } from "@travada-books/ui/components/input";
import { Checkbox } from "@travada-books/ui/components/checkbox";
import { Textarea } from "@travada-books/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@travada-books/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { DatePicker } from "@/components/shared/date-picker";
import { useAuth } from "@/contexts/auth-context";
import { createInvoicePayment, type InvoicePaymentInput } from "@/lib/queries/payments";
import { useInvalidateAfterPaymentChange } from "@/hooks/use-invalidate-payment-queries";
import { formatCurrency } from "@/lib/format";

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  currency: string;
  balanceDue: number;
  onRecorded?: (paidInFull: boolean) => void;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  currency,
  balanceDue,
  onRecorded,
}: RecordPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Wallet01Icon size={15} className='text-muted-foreground' />
            Record payment
          </DialogTitle>
          <DialogDescription>
            Log a payment received against this invoice. The balance and status update automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Keyed on `open` so the form's local state (amount prefill, date,
            method, …) is freshly initialized from props every time the
            dialog opens, instead of syncing it in an Effect. */}
        <RecordPaymentForm
          key={open ? "open" : "closed"}
          invoiceId={invoiceId}
          currency={currency}
          balanceDue={balanceDue}
          onOpenChange={onOpenChange}
          onRecorded={onRecorded}
        />
      </DialogContent>
    </Dialog>
  );
}

type RecordPaymentFormProps = {
  invoiceId: string;
  currency: string;
  balanceDue: number;
  onOpenChange: (open: boolean) => void;
  onRecorded?: (paidInFull: boolean) => void;
};

function RecordPaymentForm({
  invoiceId,
  currency,
  balanceDue,
  onOpenChange,
  onRecorded,
}: RecordPaymentFormProps) {
  const { orgId, user } = useAuth();
  const invalidateAfterPaymentChange = useInvalidateAfterPaymentChange();

  const [amount, setAmount] = useState(() => {
    const prefill = balanceDue > 0 ? Number(balanceDue.toFixed(2)) : 0;
    return prefill > 0 ? String(prefill) : "";
  });
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  const parsedAmount = Number(amount);
  const isAmountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isOverpaying = isAmountValid && parsedAmount > balanceDue;
  const overpaidBy = isOverpaying ? parsedAmount - balanceDue : 0;
  // An overpayment is a liability owed back to the customer and there is no
  // credit-note system yet, so it must be deliberate rather than a typo that
  // sails through. Recording it is still permitted — a customer who rounds up
  // an M-Pesa payment has genuinely paid that amount.
  const needsOverpayConfirm = isOverpaying && !confirmOverpay;

  function handleAmountChange(next: string) {
    setAmount(next);
    // Re-arm the guard on every edit. Without this, confirming a small
    // overpayment and then mistyping a larger one would submit unconfirmed.
    setConfirmOverpay(false);
  }

  function handleSubmit() {
    if (!isAmountValid || needsOverpayConfirm || !date || !orgId) return;

    // Normalize to noon local time so the UTC-converted ISO string never
    // drifts onto the previous/next calendar day for the picked date.
    const paidAt = new Date(date);
    paidAt.setHours(12, 0, 0, 0);

    const input: InvoicePaymentInput = {
      org_id: orgId,
      invoice_id: invoiceId,
      recorded_by: user?.id ?? null,
      amount: parsedAmount,
      currency,
      paid_at: paidAt.toISOString(),
      method,
      reference: reference.trim() || null,
      note: note.trim() || null,
    };

    setSubmitting(true);
    toast.promise(createInvoicePayment(input), {
      loading: "Recording payment…",
      success: () => {
        invalidateAfterPaymentChange(invoiceId);
        onRecorded?.(parsedAmount >= balanceDue);
        onOpenChange(false);
        setSubmitting(false);
        return "Payment recorded";
      },
      error: () => {
        setSubmitting(false);
        return "Failed to record payment";
      },
    });
  }

  return (
    <>
      <div className='space-y-4 py-1'>
        <div className='space-y-1.5'>
          <Label className='text-xs'>Amount</Label>
          <InputGroup>
            <InputGroupAddon align='inline-start'>
              <InputGroupText className='font-medium text-foreground'>
                {currency}
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type='number'
              step='0.01'
              min='0'
              inputMode='decimal'
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder='0.00'
              autoFocus
            />
          </InputGroup>
          {isOverpaying ?
            <div className='space-y-2 rounded-md border border-amber-500/40 bg-amber-50 p-2.5 dark:bg-amber-900/20'>
              <p className='flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400'>
                <Alert02Icon size={12} className='mt-px shrink-0' />
                <span>
                  This is {formatCurrency(overpaidBy, currency)} more than the
                  remaining balance of {formatCurrency(balanceDue, currency)}.
                </span>
              </p>
              {/* id/htmlFor rather than nesting: Base UI's Checkbox renders a
                  button, so a wrapping <label> would not toggle it. */}
              <div className='flex items-start gap-2'>
                <Checkbox
                  id='confirm-overpayment'
                  checked={confirmOverpay}
                  onCheckedChange={(v) => setConfirmOverpay(!!v)}
                  className='mt-px'
                />
                <Label
                  htmlFor='confirm-overpayment'
                  className='cursor-pointer text-[11px] font-normal leading-relaxed text-amber-700 dark:text-amber-400'
                >
                  Confirm this overpayment of {formatCurrency(overpaidBy, currency)}
                </Label>
              </div>
            </div>
          : <p className='text-[11px] text-muted-foreground'>
              Balance due: {formatCurrency(balanceDue, currency)}
            </p>
          }
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>Payment date</Label>
          <DatePicker value={date} onChange={setDate} placeholder='Pick a date' />
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v ?? "mpesa")}>
            <SelectTrigger className='text-xs w-full'>
              <SelectValue placeholder='Select' />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value} className='text-xs'>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>
            Reference <span className='font-normal text-muted-foreground'>(optional)</span>
          </Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder='M-Pesa code, cheque no. …'
            className='text-xs'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>
            Note <span className='font-normal text-muted-foreground'>(optional)</span>
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className='text-xs'
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isAmountValid || needsOverpayConfirm || submitting}
          className='gap-1.5'
        >
          <Wallet01Icon size={13} />
          {submitting ? "Recording…" : "Record payment"}
        </Button>
      </DialogFooter>
    </>
  );
}
