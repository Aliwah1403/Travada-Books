import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User02Icon, PlusSignIcon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command";
import { Avatar, AvatarFallback, AvatarImage } from "@travada-books/ui/components/avatar";
import { cn } from "@travada-books/ui/lib/utils";
import { CreateCustomerSheet } from "@/components/customers/create-customer-sheet";
import { listCustomers } from "@/lib/queries/customers";
import { useAuth } from "@/contexts/auth-context";

export type SelectedCustomer = {
  id: string;
  name: string;
  email: string | null;
  billing_email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
};

type CustomerComboboxProps = {
  value: string | null;
  onChange: (customer: SelectedCustomer | null) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function CustomerCombobox({ value, onChange }: CustomerComboboxProps) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => listCustomers(orgId!),
    enabled: !!orgId,
  });

  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <CreateCustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultName={search}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 text-xs ring-offset-background transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !selected && "text-muted-foreground",
              )}
            >
              {selected ? (
                <>
                  <Avatar className="size-5">
                    <AvatarImage src={selected.logo_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {initials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left font-medium text-foreground">
                    {selected.name}
                  </span>
                  {selected.email && (
                    <span className="truncate text-muted-foreground">
                      {selected.email}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <User02Icon size={13} className="shrink-0" />
                  <span>Search customers...</span>
                </>
              )}
            </button>
          }
        />
        <PopoverContent
          className="w-[var(--anchor-width)] p-0"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filtered.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      No customer found.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setOpen(false);
                        setSheetOpen(true);
                      }}
                    >
                      <PlusSignIcon size={12} />
                      Create &quot;{search}&quot;
                    </Button>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      data-checked={value === customer.id}
                      onSelect={() => {
                        onChange(
                          value === customer.id
                            ? null
                            : {
                                id: customer.id,
                                name: customer.name,
                                email: customer.email,
                                billing_email: customer.billing_email,
                                phone: customer.phone,
                                address_line1: customer.address_line1,
                                address_line2: customer.address_line2,
                                city: customer.city,
                                zip: customer.zip,
                                country: customer.country,
                              },
                        );
                        setOpen(false);
                      }}
                    >
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={customer.logo_url ?? undefined} />
                        <AvatarFallback className="text-[9px]">
                          {initials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {customer.name}
                        </span>
                        {customer.email && (
                          <span className="truncate text-muted-foreground">
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
