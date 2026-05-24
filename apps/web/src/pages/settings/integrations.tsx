export function IntegrationsSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect payment methods and communication channels — M-Pesa, Stripe, WhatsApp, Gmail, and more.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          Integrations will be available in a future update.
        </p>
      </div>
    </div>
  )
}
