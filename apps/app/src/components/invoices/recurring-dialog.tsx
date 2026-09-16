import { useState } from "react";
import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@travada-books/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@travada-books/ui/components/select";
import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@travada-books/ui/lib/utils";

export type RepeatFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type RecurringFrequency = "one_time" | RepeatFrequency;

type EndsType = "on" | "after" | "never";

export type RecurringSettings = {
  frequency: RepeatFrequency;
  endsType: EndsType;
  endsOnDate: Date | undefined;
  endsAfterCount: string;
};

const FREQUENCY_LABELS: Record<RepeatFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
};

function getNextDates(frequency: RepeatFrequency, count = 3): Date[] {
  const base = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= count; i++) {
    switch (frequency) {
      case "weekly":
        dates.push(addWeeks(base, i));
        break;
      case "biweekly":
        dates.push(addWeeks(base, i * 2));
        break;
      case "monthly":
        dates.push(addMonths(base, i));
        break;
      case "quarterly":
        dates.push(addMonths(base, i * 3));
        break;
      case "yearly":
        dates.push(addYears(base, i));
        break;
    }
  }
  return dates;
}

type RecurringDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: RecurringSettings) => void;
};

export function RecurringDialog({
  open,
  onOpenChange,
  onSave,
}: RecurringDialogProps) {
  const [frequency, setFrequency] = useState<RepeatFrequency>("monthly");
  const [endsType, setEndsType] = useState<EndsType>("never");
  const [endsOnDate, setEndsOnDate] = useState<Date | undefined>(undefined);
  const [endsAfterCount, setEndsAfterCount] = useState("12");

  const previewDates = getNextDates(frequency);

  function handleSave() {
    onSave({ frequency, endsType, endsOnDate, endsAfterCount });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='md:max-w-xl p-0' showCloseButton={false}>
        <div className='flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between border-b px-5 py-4'>
            <p className='text-sm font-semibold'>Recurring Invoice</p>
            <DialogClose
              render={
                <Button variant='ghost' size='icon-sm' aria-label='Close' />
              }
            />
          </div>

          <div className='flex flex-col gap-5 px-5 py-5'>
            {/* Repeat frequency */}
            <div className='flex flex-col gap-2'>
              <Label className='text-xs text-muted-foreground'>Repeat</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as RepeatFrequency)}
              >
                <SelectTrigger className='w-full text-xs'>
                  <span>{FREQUENCY_LABELS[frequency]}</span>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as RepeatFrequency[]).map(
                    (f) => (
                      <SelectItem key={f} value={f} className='text-xs'>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Ends */}
            <div className='flex flex-col gap-3'>
              <Label className='text-xs text-muted-foreground'>Ends</Label>

              {/* On date */}
              <button
                type='button'
                className='flex items-center gap-3'
                onClick={() => setEndsType("on")}
              >
                <Radio checked={endsType === "on"} />
                <span className='text-xs'>On</span>
                <div
                  className={cn(
                    "flex-1 transition-opacity",
                    endsType !== "on" && "pointer-events-none opacity-40",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DatePicker
                    value={endsOnDate}
                    onChange={setEndsOnDate}
                    placeholder='Pick end date'
                  />
                </div>
              </button>

              {/* After N invoices */}
              <button
                type='button'
                className='flex items-center gap-3'
                onClick={() => setEndsType("after")}
              >
                <Radio checked={endsType === "after"} />
                <span className='text-xs'>After</span>
                <div
                  className={cn(
                    "flex items-center gap-2 transition-opacity",
                    endsType !== "after" && "pointer-events-none opacity-40",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={endsAfterCount}
                    onChange={(e) => setEndsAfterCount(e.target.value)}
                    className='h-8 w-16 text-center text-xs'
                  />
                  <span className='text-xs text-muted-foreground'>
                    invoices
                  </span>
                </div>
              </button>

              {/* Never */}
              <button
                type='button'
                className='flex items-center gap-3'
                onClick={() => setEndsType("never")}
              >
                <Radio checked={endsType === "never"} />
                <span className='text-xs'>Never</span>
              </button>
            </div>

            <Separator />

            {/* Upcoming preview */}
            <div className='flex flex-col gap-2'>
              <Label className='text-xs text-muted-foreground'>
                Upcoming invoices
              </Label>
              <div className='flex flex-col divide-y rounded-md border'>
                {previewDates.map((date, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between px-3 py-2 text-xs'
                  >
                    <span className='font-medium'>
                      {format(date, "MMM d, yyyy")}
                    </span>
                    <span className='text-muted-foreground'>
                      {format(date, "EEE")}
                    </span>
                  </div>
                ))}
                <div className='px-3 py-2 text-center text-xs text-muted-foreground'>
                  …
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='flex gap-2 border-t px-5 py-4'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className='flex-1' onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        checked ? "border-primary" : "border-muted-foreground/40",
      )}
    >
      {checked && <div className='size-2 rounded-full bg-primary' />}
    </div>
  );
}
