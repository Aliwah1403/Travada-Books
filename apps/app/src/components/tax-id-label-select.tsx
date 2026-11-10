import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select"
import { TAX_ID_LABELS } from "@travada-books/pdf"

// The name printed in front of the business tax number on invoices and quotes.
export function TaxIdLabelSelect({
  value,
  onValueChange,
  id,
}: {
  value: string
  onValueChange: (value: string) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger id={id} aria-label="Tax number label" className="w-24 shrink-0 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TAX_ID_LABELS.map((label) => (
          <SelectItem key={label} value={label} className="text-xs">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
