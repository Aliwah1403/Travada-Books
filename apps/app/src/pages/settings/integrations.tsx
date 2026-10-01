import { useState } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@travada-books/ui/components/card"
import { Switch } from "@travada-books/ui/components/switch"
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
import { GmailIcon, MpesaIcon, OutlookIcon, StripeIcon, WhatsappIcon, type Icon } from "@travada-books/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import {
  connectGmail,
  connectOutlook,
  deleteInboxAccount,
  listInboxAccounts,
  type InboxAccount,
} from "@/lib/queries/inbox"
import { IntegrationIcon } from "@/components/settings/integration-icon"

function GallerySkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="mt-2 h-4 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded-md bg-muted" />
      </CardHeader>
      <CardFooter className="justify-between border-t pt-4">
        <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-7 animate-pulse rounded-full bg-muted" />
      </CardFooter>
    </Card>
  )
}

type ConnectedProvider = "gmail" | "outlook"

const connectedProviderConfig: Record<
  ConnectedProvider,
  {
    icon: Icon
    title: string
    description: string
    detailRoute: string
    connectFn: () => Promise<void>
  }
> = {
  gmail: {
    icon: GmailIcon,
    title: "Gmail",
    description:
      "Automatically pull receipts and invoices into your inbox from a connected Gmail mailbox.",
    detailRoute: "/settings/integrations/gmail",
    connectFn: connectGmail,
  },
  outlook: {
    icon: OutlookIcon,
    title: "Outlook",
    description: "Pull receipts and invoices from a connected Outlook mailbox.",
    detailRoute: "/settings/integrations/outlook",
    connectFn: connectOutlook,
  },
}

function ConnectedProviderCard({ provider }: { provider: ConnectedProvider }) {
  const { icon, title, description, detailRoute, connectFn } = connectedProviderConfig[provider]
  const { orgId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: allAccounts = [], isLoading } = useQuery({
    queryKey: ["inbox-accounts", orgId],
    queryFn: () => listInboxAccounts(orgId!),
    enabled: !!orgId,
  })

  // listInboxAccounts returns every provider's accounts — filter to this
  // card's provider so Gmail/Outlook accounts never leak into each other.
  const accounts = allAccounts.filter((a: InboxAccount) => a.provider === provider)
  const connectedAccounts = accounts.filter((a) => a.status === "connected")
  const isConnected = connectedAccounts.length > 0

  const disconnectAllMutation = useMutation({
    mutationFn: () => Promise.all(connectedAccounts.map((a) => deleteInboxAccount(a.id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-accounts", orgId] })
    },
  })

  if (isLoading) {
    return <GallerySkeletonCard />
  }

  async function handleConnect() {
    setConnecting(true)
    try {
      // On success the browser navigates to the provider — no success toast needed.
      await connectFn()
    } catch {
      toast.error(`Couldn't start ${title} connection. Please try again.`)
      setConnecting(false)
    }
  }

  function handleDisconnect() {
    toast.promise(disconnectAllMutation.mutateAsync(), {
      loading: "Disconnecting…",
      success: `${title} disconnected.`,
      error: "Something went wrong. Please try again.",
    })
  }

  const statusLabel =
    !isConnected ? "Not connected"
    : connectedAccounts.length > 1 ? `${connectedAccounts.length} accounts connected`
    : `Connected as ${connectedAccounts[0]!.email}`

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate(detailRoute)}
        onKeyDown={(e) => {
          if (e.key === "Enter") navigate(detailRoute)
        }}
        className="cursor-pointer ring-1 ring-foreground/10 transition-colors fine-hover:ring-foreground/25 active:opacity-90"
      >
        <CardHeader>
          <IntegrationIcon brand={provider} icon={icon} />
          <CardTitle className="mt-2">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground truncate">{statusLabel}</span>
          <Switch
            checked={isConnected}
            disabled={connecting}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) => {
              if (checked) {
                handleConnect()
              } else {
                setConfirmOpen(true)
              }
            }}
          />
        </CardFooter>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {connectedAccounts.length > 1 ?
                `This stops syncing all ${connectedAccounts.length} connected ${title} accounts. You can reconnect anytime.`
              : `This stops syncing ${connectedAccounts[0]?.email}. You can reconnect anytime.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                handleDisconnect()
                setConfirmOpen(false)
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type ComingSoonProvider = {
  brand: "mpesa" | "stripe" | "whatsapp"
  icon: typeof OutlookIcon
  title: string
  description: string
}

const comingSoonProviders: ComingSoonProvider[] = [
  {
    brand: "mpesa",
    icon: MpesaIcon,
    title: "M-Pesa",
    description: "Sync incoming payments automatically and accept M-Pesa STK push on invoices.",
  },
  {
    brand: "stripe",
    icon: StripeIcon,
    title: "Stripe",
    description: "Accept card payments directly from your invoices.",
  },
  {
    brand: "whatsapp",
    icon: WhatsappIcon,
    title: "WhatsApp",
    description: "Send invoices and reminders, and ask your assistant questions, over WhatsApp.",
  },
]

function ComingSoonCard({ brand, icon, title, description }: ComingSoonProvider) {
  return (
    <Card className="opacity-60">
      <CardHeader>
        <IntegrationIcon brand={brand} icon={icon} />
        <CardTitle className="mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-between border-t pt-4">
        <span className="text-xs text-muted-foreground">Coming soon</span>
        <Switch checked={false} disabled />
      </CardFooter>
    </Card>
  )
}

export function IntegrationsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect payment methods and communication channels — M-Pesa, Stripe, WhatsApp, Gmail,
          and more.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ConnectedProviderCard provider="gmail" />
        <ConnectedProviderCard provider="outlook" />
        {comingSoonProviders.map((provider) => (
          <ComingSoonCard key={provider.brand} {...provider} />
        ))}
      </div>
    </div>
  )
}
