import { useState } from "react";
import { toast } from "sonner";
import {
  Mail01Icon,
  WhatsappIcon,
  Link01Icon,
  Download01Icon,
  TickIcon,
} from "@travada-books/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import { cn } from "@travada-books/ui/lib/utils";
import { Spinner } from "@/components/shared/spinner";
import type { SendChannel } from "@/lib/send-channels";

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "invoice" | "quote";
  documentNumber: string | null;
  customerEmail: string | null;
  publicUrl: string;
  whatsappUrl: string;
  onSend: (channel: SendChannel) => Promise<void>;
}

type OptionDef = {
  channel: SendChannel;
  icon: typeof Mail01Icon;
  title: string;
  description: string;
  disabled?: boolean;
};

export function SendDocumentDialog({
  open,
  onOpenChange,
  kind,
  documentNumber,
  customerEmail,
  publicUrl,
  whatsappUrl,
  onSend,
}: SendDocumentDialogProps) {
  const [pending, setPending] = useState<SendChannel | null>(null);

  const options: OptionDef[] = [
    {
      channel: "email",
      icon: Mail01Icon,
      title: "Email",
      description: customerEmail
        ? `Email it to ${customerEmail}`
        : "This customer has no email address",
      disabled: !customerEmail,
    },
    {
      channel: "whatsapp",
      icon: WhatsappIcon,
      title: "WhatsApp",
      description: "Opens WhatsApp with the link ready to send",
    },
    {
      channel: "link",
      icon: Link01Icon,
      title: "Copy link",
      description: "Copy the link and share it anywhere",
    },
    {
      channel: "pdf",
      icon: Download01Icon,
      title: "Download PDF",
      description: "Download the PDF to send yourself",
    },
    {
      channel: "manual",
      icon: TickIcon,
      title: "Mark as sent",
      description: "You've already sent it another way",
    },
  ];

  async function handleSelect(option: OptionDef) {
    if (option.disabled || pending) return;

    if (option.channel === "whatsapp") {
      // Must open synchronously, before any await — popup blockers eat a
      // window.open that fires after an awaited call.
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
    if (option.channel === "link") {
      // Same reasoning: kick off the clipboard write before awaiting.
      navigator.clipboard.writeText(publicUrl).catch(() => {
        toast.error("Couldn't copy the link");
      });
    }

    setPending(option.channel);
    try {
      await onSend(option.channel);
      if (option.channel === "link") toast.success("Link copied");
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep the dialog open so the user
      // can retry or pick a different channel.
    } finally {
      setPending(null);
    }
  }

  const documentLabel = kind === "invoice" ? "invoice" : "quote";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Send {documentLabel} {documentNumber ?? ""}
          </DialogTitle>
          <DialogDescription>
            Choose how you're sending it. It will be marked as sent either way.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const Icon = option.icon;
            const isPending = pending === option.channel;
            const isDisabled = !!option.disabled || (!!pending && !isPending);
            return (
              <button
                key={option.channel}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(option)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-[colors,transform] duration-100 [transition-timing-function:var(--ease-out)]",
                  "fine-hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
                  "active:scale-[0.99]",
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  {isPending ? (
                    <Spinner size={14} />
                  ) : (
                    <Icon size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium">{option.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
