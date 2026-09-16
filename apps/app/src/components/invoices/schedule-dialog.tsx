import { useState } from "react";
import { format, addDays, addHours, startOfTomorrow } from "date-fns";
import { ClockCheckIcon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@travada-books/ui/components/dialog";
import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@travada-books/ui/lib/utils";

export type ScheduleSettings = {
  sendAt: Date;
};

type QuickOption = {
  label: string;
  sublabel: string;
  date: () => Date;
};

const QUICK_OPTIONS: QuickOption[] = [
  {
    label: "Tomorrow morning",
    sublabel: () => format(addHours(startOfTomorrow(), 9), "EEE, MMM d · 9:00 'AM'"),
    date: () => addHours(startOfTomorrow(), 9),
  },
  {
    label: "In 2 days",
    sublabel: () => format(addHours(addDays(new Date(), 2), 9), "EEE, MMM d · 9:00 'AM'"),
    date: () => addHours(addDays(new Date(), 2), 9),
  },
  {
    label: "Next Monday",
    sublabel: () => {
      const d = new Date();
      const daysUntilMonday = (1 + 7 - d.getDay()) % 7 || 7;
      return format(addHours(addDays(d, daysUntilMonday), 9), "EEE, MMM d · 9:00 'AM'");
    },
    date: () => {
      const d = new Date();
      const daysUntilMonday = (1 + 7 - d.getDay()) % 7 || 7;
      return addHours(addDays(d, daysUntilMonday), 9);
    },
  },
];

// resolve sublabel at render time
function resolveSubLabel(opt: QuickOption) {
  return (opt.sublabel as unknown as () => string)();
}

type ScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: ScheduleSettings) => void;
};

export function ScheduleDialog({
  open,
  onOpenChange,
  onSave,
}: ScheduleDialogProps) {
  const [selected, setSelected] = useState<"quick" | "custom">("quick");
  const [quickIndex, setQuickIndex] = useState(0);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState("09:00");

  function getScheduledDate(): Date {
    if (selected === "quick") return QUICK_OPTIONS[quickIndex].date();
    if (customDate) {
      const [h, m] = customTime.split(":").map(Number);
      const d = new Date(customDate);
      d.setHours(h, m, 0, 0);
      return d;
    }
    return addHours(startOfTomorrow(), 9);
  }

  function handleSave() {
    onSave({ sendAt: getScheduledDate() });
    onOpenChange(false);
  }

  const scheduledDate = getScheduledDate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0" showCloseButton={false}>
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <ClockCheckIcon size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold">Schedule Send</p>
            </div>
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Close" />
              }
            />
          </div>

          <div className="flex flex-col gap-5 px-5 py-5">
            {/* Quick options */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                Quick options
              </Label>
              <div className="flex flex-col gap-1.5">
                {QUICK_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelected("quick");
                      setQuickIndex(i);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors",
                      selected === "quick" && quickIndex === i
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {resolveSubLabel(opt)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom date & time */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                Custom date & time
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setSelected("custom")}
                  className={cn(
                    selected === "custom" ? "" : "opacity-70",
                  )}
                >
                  <DatePicker
                    value={customDate}
                    onChange={(d) => {
                      setCustomDate(d);
                      setSelected("custom");
                    }}
                    placeholder="Pick date"
                  />
                </div>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value);
                    setSelected("custom");
                  }}
                  onClick={() => setSelected("custom")}
                  className={cn(
                    "flex h-9 w-full rounded-md border bg-transparent px-3 text-xs ring-offset-background transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected !== "custom" && "opacity-70",
                  )}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-xs">
              <ClockCheckIcon size={13} className="shrink-0 text-muted-foreground" />
              <span>
                Invoice will be sent on{" "}
                <span className="font-medium">
                  {format(scheduledDate, "EEE, MMM d, yyyy")}
                </span>{" "}
                at{" "}
                <span className="font-medium">
                  {format(scheduledDate, "h:mm a")}
                </span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t px-5 py-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1 gap-1.5" onClick={handleSave}>
              <ClockCheckIcon size={13} />
              Schedule Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
