import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@travada-books/ui/components/select"
import { Textarea } from "@travada-books/ui/components/textarea"

export function InvoiceSettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold">Invoice Defaults</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Applied automatically when creating a new invoice.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-prefix">Invoice number prefix</Label>
            <Input id="invoice-prefix" placeholder="INV-" defaultValue="INV-" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="starting-number">Starting number</Label>
            <Input id="starting-number" type="number" placeholder="1" defaultValue="1" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due-days">Default due days</Label>
          <Select defaultValue="30">
            <SelectTrigger id="due-days" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="default-notes">Default notes / terms</Label>
          <Textarea
            id="default-notes"
            placeholder="e.g. Payment due within 30 days. Bank transfer preferred."
            rows={3}
          />
        </div>

        <Button size="sm" className="w-fit">Save changes</Button>
      </section>
    </div>
  )
}
