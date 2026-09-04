import { Separator } from "@travada-books/ui/components/separator"
import { InboxConnectedAccounts } from "@/components/settings/inbox-connected-accounts"

export function IntegrationsSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect payment methods and communication channels — M-Pesa, Stripe, WhatsApp, Gmail, and more.
        </p>
      </div>

      <InboxConnectedAccounts />

      <Separator />

      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">More integrations coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          M-Pesa, Stripe, and WhatsApp integrations will be available in a future update.
        </p>
      </div>
    </div>
  )
}
