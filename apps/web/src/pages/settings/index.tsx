import { Tabs, TabsContent, TabsList, TabsTrigger } from "@travada-books/ui/components/tabs"
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

function BusinessProfileTab() {
  return (
    <div className="flex flex-col gap-5">
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
          <Label htmlFor="email">Business email</Label>
          <Input id="email" type="email" placeholder="billing@yourbusiness.com" />
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
    </div>
  )
}

function InvoiceDefaultsTab() {
  return (
    <div className="flex flex-col gap-5">
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
          <SelectTrigger id="due-days">
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
    </div>
  )
}

function BaseCurrencyTab() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Your base currency is used to display all totals and reports. Invoices can still be sent in
        any currency — amounts are converted to your base currency for tracking.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Base currency</Label>
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
    </div>
  )
}

function AccountTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" placeholder="John Doe" defaultValue="John Doe" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" type="email" defaultValue="john@example.com" />
        </div>
      </div>

      <Separator />

      <p className="text-sm font-medium">Change password</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" placeholder="••••••••" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" placeholder="••••••••" />
        </div>
      </div>
      <Button size="sm" className="w-fit">Save changes</Button>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="p-6">
      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Defaults</TabsTrigger>
          <TabsTrigger value="currency">Base Currency</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <BusinessProfileTab />
        </TabsContent>
        <TabsContent value="invoice">
          <InvoiceDefaultsTab />
        </TabsContent>
        <TabsContent value="currency">
          <BaseCurrencyTab />
        </TabsContent>
        <TabsContent value="account">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
