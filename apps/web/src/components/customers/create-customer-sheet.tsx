import { useState, useEffect } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@travada-books/ui/components/sheet";

type CreateCustomerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
};

export function CreateCustomerSheet({
  open,
  onOpenChange,
  defaultName = "",
}: CreateCustomerSheetProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEmail("");
      setPhone("");
      setAddress("");
      setVatNumber("");
      setContactPerson("");
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>New Customer</SheetTitle>
          <SheetDescription>
            Add a new customer to your account.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {/* Required fields */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-name" className="text-xs">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Ltd"
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-email" className="text-xs">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cs-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@acme.com"
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-phone" className="text-xs">
              Phone
            </Label>
            <Input
              id="cs-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className="text-xs"
            />
          </div>

          <Separator />

          {/* Optional fields */}
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Optional
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-address" className="text-xs">
              Address
            </Label>
            <Input
              id="cs-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nairobi, Kenya"
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-vat" className="text-xs">
              VAT / KRA PIN
            </Label>
            <Input
              id="cs-vat"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="P051234567A"
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-contact" className="text-xs">
              Contact Person
            </Label>
            <Input
              id="cs-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Jane Doe"
              className="text-xs"
            />
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" disabled={!name || !email}>
            Create Customer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
