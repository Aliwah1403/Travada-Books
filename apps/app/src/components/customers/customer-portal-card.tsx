import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy01Icon,
  ArrowUpRight01Icon,
  WhatsappIcon,
  MoreHorizontalIcon,
  ReloadIcon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Switch } from "@travada-books/ui/components/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog";
import { buildWhatsappUrl, toWhatsappNumber } from "@/lib/whatsapp";
import {
  setCustomerPortal,
  regenerateCustomerPortalId,
} from "@/lib/queries/customer-portal";

type CustomerPortalCardProps = {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerCountryCode?: string | null;
  orgName: string;
  portalEnabled: boolean;
  portalId: string | null;
};

export function CustomerPortalCard({
  customerId,
  customerName,
  customerPhone,
  customerCountryCode,
  orgName,
  portalEnabled,
  portalId,
}: CustomerPortalCardProps) {
  const queryClient = useQueryClient();
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  // Enabled but no id yet is a transient/inconsistent state (shouldn't happen
  // once the toggle mutation lands, but never crash rendering it).
  const hasLink = portalEnabled && !!portalId;
  const portalUrl = portalId ? `${window.location.origin}/p/${portalId}` : null;

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) => setCustomerPortal(customerId, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateCustomerPortalId(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      setRegenerateOpen(false);
    },
  });

  function handleToggle(next: boolean) {
    toast.promise(toggleMutation.mutateAsync(next), {
      loading:
        next ? "Enabling customer portal…" : "Disabling customer portal…",
      success: next ? "Customer portal enabled" : "Customer portal disabled",
      error: "Something went wrong",
    });
  }

  async function copyLink() {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function openLink() {
    if (!portalUrl) return;
    window.open(portalUrl, "_blank", "noreferrer");
  }

  function shareOnWhatsapp() {
    if (!portalUrl) return;
    const phoneDigits = toWhatsappNumber(customerPhone, customerCountryCode);
    const text = `Hi ${customerName}, you can view all your invoices, quotes and statements from ${orgName} here: ${portalUrl}`;
    window.open(buildWhatsappUrl(phoneDigits, text), "_blank", "noreferrer");
  }

  function confirmRegenerate() {
    toast.promise(regenerateMutation.mutateAsync(), {
      loading: "Creating new link…",
      success: "New link created",
      error: "Something went wrong",
    });
  }

  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>Customer portal</p>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Give this customer one link to see their invoices, quotes and
            statements.
          </p>
        </div>
        <Switch
          checked={portalEnabled}
          disabled={toggleMutation.isPending}
          onCheckedChange={(checked) => handleToggle(checked)}
        />
      </div>

      {hasLink && portalUrl && (
        <div className='mt-4 flex flex-col gap-2 opacity-100 transition-opacity duration-150 [transition-timing-function:var(--ease-out)]'>
          <div className='flex items-center gap-2'>
            <Input readOnly value={portalUrl} className='font-mono text-xs' />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant='outline' />}>
                <MoreHorizontalIcon size={13} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-full'>
                <DropdownMenuItem onClick={() => setRegenerateOpen(true)}>
                  <ReloadIcon size={13} />
                  Regenerate link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={copyLink}
            >
              <Copy01Icon size={13} />
              Copy link
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={openLink}
            >
              <ArrowUpRight01Icon size={13} />
              Open
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={shareOnWhatsapp}
            >
              <WhatsappIcon size={13} />
              Share on WhatsApp
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate portal link?</AlertDialogTitle>
            <AlertDialogDescription>
              The old link will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={confirmRegenerate}
              disabled={regenerateMutation.isPending}
            >
              Regenerate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
