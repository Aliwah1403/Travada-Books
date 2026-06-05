import { useState } from "react";
import { useFormatDate } from "@/hooks/use-format-date";
import type { DropdownNavProps, DropdownProps } from "react-day-picker";
import { Calendar01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Calendar } from "@travada-books/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { cn } from "@travada-books/ui/lib/utils";

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
};

function handleCalendarChange(
  _value: string | number,
  _e: React.ChangeEventHandler<HTMLSelectElement>,
) {
  const _event = {
    target: { value: String(_value) },
  } as React.ChangeEvent<HTMLSelectElement>;
  _e(_event);
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const { formatDate } = useFormatDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 text-xs ring-offset-background transition-colors",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <Calendar01Icon size={13} className="shrink-0" />
            <span>{value ? formatDate(value) : placeholder}</span>
          </button>
        }
      />
      <PopoverContent className="w-auto min-w-[280px] min-h-[350px] p-0" align="start">
        <Calendar
          captionLayout="dropdown"
          className="w-full h-full"
          classNames={{ month_caption: "mx-0" }}
          components={{
            Dropdown: (props: DropdownProps) => {
              const currentLabel =
                props.options?.find(
                  (o) => String(o.value) === String(props.value),
                )?.label ?? String(props.value);
              return (
                <Select
                  value={String(props.value)}
                  onValueChange={(val) => {
                    if (props.onChange) handleCalendarChange(val, props.onChange);
                  }}
                >
                  <SelectTrigger className="h-7 w-fit text-xs font-medium first:grow">
                    <span>{currentLabel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {props.options?.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        disabled={option.disabled}
                        className="text-xs"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            },
            DropdownNav: (props: DropdownNavProps) => (
              <div className="flex w-full items-center gap-2">{props.children}</div>
            ),
          }}
          defaultMonth={value ?? new Date()}
          hideNavigation
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          startMonth={new Date(1980, 0)}
          endMonth={new Date(2100, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
