import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@travada-books/ui/components/button"
import { Badge } from "@travada-books/ui/components/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog"
import { cn } from "@travada-books/ui/lib/utils"
import { Mail01Icon, CheckmarkCircle01Icon, Alert01Icon, type Icon } from "@travada-books/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import {
  connectGmail,
  deleteInboxAccount,
  listInboxAccounts,
  syncInboxAccountNow,
  type InboxAccount,
} from "@/lib/queries/inbox"

// Mirrors invoice-status-badge.tsx's {label, icon, className} + Badge shape —
// color-only crossfade (transition-colors), no scale/slide, per CLAUDE.md.
const accountStatusConfig: Record<
  InboxAccount["status"],
  { label: string; icon: Icon; className: string }
> = {
  connected: {
    label: "Connected",
    icon: CheckmarkCircle01Icon,
    className:
      "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  disconnected: {
    label: "Disconnected",
    icon: Alert01Icon,
    className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
}

function AccountStatusBadge({ status }: { status: InboxAccount["status"] }) {
  const { icon: StatusIcon, label, className } = accountStatusConfig[status]
  return (
    <Badge className={cn("border-0 font-medium rounded-md transition-colors duration-200", className)}>
      <StatusIcon size={12} />
      {label}
    </Badge>
  )
}

export function InboxConnectedAccounts() {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState<InboxAccount | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["inbox-accounts", orgId],
    queryFn: () => listInboxAccounts(orgId!),
    enabled: !!orgId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInboxAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-accounts", orgId] })
    },
  })

  async function handleConnect() {
    setConnecting(true)
    try {
      // On success the browser navigates to Google — no success toast needed.
      await connectGmail()
    } catch {
      toast.error("Couldn't start Gmail connection. Please try again.")
      setConnecting(false)
    }
  }

  function handleSync(account: InboxAccount) {
    toast.promise(syncInboxAccountNow(account.id), {
      loading: "Starting sync…",
      success: "Sync started",
      error: "Failed to start sync",
    })
  }

  function handleRemove(account: InboxAccount) {
    toast.promise(deleteMutation.mutateAsync(account.id), {
      loading: account.status === "connected" ? "Disconnecting…" : "Removing…",
      success: account.status === "connected" ? "Gmail disconnected." : "Account removed.",
      error: "Something went wrong. Please try again.",
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold">Gmail</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect a Gmail mailbox to automatically pull receipts and invoices into your inbox.
        </p>
      </div>

      {isLoading ?
        <div className="flex flex-col gap-2">
          <div className="h-14 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-14 w-full animate-pulse rounded-md bg-muted" />
        </div>
      : accounts.length === 0 ?
        <div className="rounded-lg border border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium">No Gmail account connected</p>
          <p className="text-xs text-muted-foreground">
            Connect Gmail to start syncing receipts and invoices automatically.
          </p>
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            Connect Gmail
          </Button>
        </div>
      : <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <div key={account.id} className="flex flex-col gap-1.5 rounded-md border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail01Icon size={16} className="shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{account.email}</span>
                  <AccountStatusBadge status={account.status} />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {account.status === "connected" ?
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleSync(account)}>
                        Sync now
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmAccount(account)}
                      >
                        Disconnect
                      </Button>
                    </>
                  : <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConnect}
                        disabled={connecting}
                      >
                        Reconnect
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmAccount(account)}
                      >
                        Remove
                      </Button>
                    </>
                  }
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Last synced {formatDistanceToNow(new Date(account.last_accessed))} ago
              </p>

              {account.status === "disconnected" && account.error_message && (
                <p className="text-[11px] text-destructive">{account.error_message}</p>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
          >
            + Connect another Gmail account
          </button>
        </div>
      }

      <p className="text-xs text-muted-foreground">Outlook — coming soon</p>

      <AlertDialog
        open={!!confirmAccount}
        onOpenChange={(open) => {
          if (!open) setConfirmAccount(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAccount?.status === "connected" ? "Disconnect Gmail?" : "Remove account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAccount?.status === "connected" ?
                `This stops syncing ${confirmAccount?.email}. You can reconnect it later.`
              : `${confirmAccount?.email} will be removed from your connected accounts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmAccount) handleRemove(confirmAccount)
                setConfirmAccount(null)
              }}
            >
              {confirmAccount?.status === "connected" ? "Disconnect" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
