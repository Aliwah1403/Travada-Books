import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Separator } from "@travada-books/ui/components/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@travada-books/ui/components/select"
import { Textarea } from "@travada-books/ui/components/textarea"

const currencies = [
  { code: "KES", name: "Kenyan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "ZAR", name: "South African Rand" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
]

export function GeneralSettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold">Business Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Appears on your invoices, quotes, and documents.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business-name">Business name</Label>
            <Input id="business-name" placeholder="Acme Ltd" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kra-pin">KRA PIN</Label>
            <Input id="kra-pin" placeholder="A000000000A" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Business address</Label>
          <Textarea id="address" placeholder="P.O. Box 00000, Nairobi, Kenya" rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Business email <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" placeholder="billing@yourbusiness.com" required />
            <p className="text-xs text-muted-foreground">Used as the reply-to on all client emails.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" placeholder="+254 700 000 000" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Business logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
              Logo
            </div>
            <Button variant="outline" size="sm">Upload logo</Button>
          </div>
        </div>

        <Button size="sm" className="w-fit">Save changes</Button>
      </section>

      <Separator />

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold">Base Currency</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to display all totals and reports. Invoices can still be sent in any currency —
            amounts are converted to your base currency for tracking.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Currency</Label>
          <Select defaultValue="KES">
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" className="w-fit">Save changes</Button>
      </section>
    </div>
  )
}
