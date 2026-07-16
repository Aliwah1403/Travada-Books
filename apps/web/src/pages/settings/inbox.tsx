import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { Copy01Icon, Delete01Icon } from "@travada-books/ui/icons";
import { useAuth } from "@/contexts/auth-context";
import {
  addBlocklistEntry,
  getInboxEmail,
  listBlocklist,
  removeBlocklistEntry,
  type BlocklistEntry,
} from "@/lib/queries/inbox";

// Mirrors Midday's domain validation — a bare label followed by one or more
// dot-separated labels, no leading/trailing hyphens per label.
const DOMAIN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function InboxSettingsPage() {
  const { org, orgId } = useAuth();
  const queryClient = useQueryClient();

  const inboxEmail = getInboxEmail(org);

  const [blockType, setBlockType] = useState<"email" | "domain">("email");
  const [blockValue, setBlockValue] = useState("");

  const { data: blocklist = [], isLoading: blocklistLoading } = useQuery({
    queryKey: ["inbox-blocklist", orgId],
    queryFn: () => listBlocklist(orgId!),
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: (payload: { type: "email" | "domain"; value: string }) =>
      addBlocklistEntry(orgId!, payload.type, payload.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-blocklist", orgId] });
      setBlockValue("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeBlocklistEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-blocklist", orgId] });
    },
  });

  function copyEmail() {
    if (!inboxEmail) return;
    navigator.clipboard.writeText(inboxEmail);
    toast.success("Inbox email copied");
  }

  function handleAdd() {
    const trimmed = blockValue.trim();
    if (!trimmed) {
      toast.error("Enter a value to block.");
      return;
    }

    if (blockType === "email") {
      const result = z.string().email().safeParse(trimmed);
      if (!result.success) {
        toast.error("Enter a valid email address.");
        return;
      }
    } else {
      if (!DOMAIN_REGEX.test(trimmed)) {
        toast.error("Enter a valid domain, e.g. example.com.");
        return;
      }
    }

    toast.promise(
      addMutation.mutateAsync({ type: blockType, value: trimmed }),
      {
        loading: "Adding…",
        success: blockType === "email" ? "Email blocked." : "Domain blocked.",
        // 23505 = the (org_id, type, value) unique index — this sender is already blocked.
        error: (err: { code?: string }) =>
          err?.code === "23505" ?
            `"${trimmed}" is already blocked.`
          : "Failed to add. Please try again.",
      },
    );
  }

  function handleRemove(entry: BlocklistEntry) {
    toast.promise(removeMutation.mutateAsync(entry.id), {
      loading: "Removing…",
      success: "Removed from blocklist.",
      error: "Failed to remove. Please try again.",
    });
  }

  return (
    <div className='flex flex-col gap-8'>
      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Inbox email address</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Forward receipts and invoices to this address and they'll appear in
            your inbox automatically.
          </p>
        </div>

        {inboxEmail ?
          <div className='flex items-center gap-2 max-w-md'>
            <Input readOnly value={inboxEmail} className='text-xs' />
            <Button
              variant='outline'
              onClick={copyEmail}
              title='Copy inbox email'
            >
              <Copy01Icon size={14} />
            </Button>
          </div>
        : <p className='text-xs text-muted-foreground'>Not available yet</p>}
      </section>

      <Separator />

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Blocked senders</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Email from these addresses or domains is ignored — it never reaches
            your inbox.
          </p>
        </div>

        <div className='flex items-end gap-2'>
          <div className='flex flex-col gap-1.5 w-32'>
            <Label>Type</Label>
            <Select
              value={blockType}
              onValueChange={(v) => setBlockType(v as "email" | "domain")}
            >
              <SelectTrigger className='h-9 text-xs w-full'>
                <SelectValue className='capitalize' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='email' className='text-xs'>
                  Email
                </SelectItem>
                <SelectItem value='domain' className='text-xs'>
                  Domain
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1.5 flex-1'>
            <Label htmlFor='block-value'>Value</Label>
            <Input
              id='block-value'
              placeholder={
                blockType === "email" ? "sender@example.com" : "example.com"
              }
              className='h-10'
              value={blockValue}
              onChange={(e) => setBlockValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <Button onClick={handleAdd} disabled={addMutation.isPending}>
            Add
          </Button>
        </div>

        <div className='flex flex-col gap-1'>
          {blocklistLoading ?
            <div className='h-9 w-full animate-pulse rounded-md bg-muted' />
          : blocklist.length === 0 ?
            <p className='text-xs text-muted-foreground'>No blocked senders.</p>
          : blocklist.map((entry) => (
              <div
                key={entry.id}
                className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'
              >
                <div className='flex items-center gap-2'>
                  <span className='rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                    {entry.type === "email" ? "Email" : "Domain"}
                  </span>
                  <span className='text-xs'>{entry.value}</span>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => handleRemove(entry)}
                  disabled={removeMutation.isPending}
                  title='Remove from blocklist'
                >
                  <Delete01Icon size={14} />
                </Button>
              </div>
            ))
          }
        </div>
      </section>

      <Separator />

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Connected accounts</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Connect Gmail or Outlook to pull in receipts automatically.
          </p>
        </div>

        <div className='flex items-center justify-center rounded-md border border-dashed px-4 py-6 text-xs text-muted-foreground opacity-60 cursor-not-allowed'>
          Coming soon
        </div>
      </section>
    </div>
  );
}
