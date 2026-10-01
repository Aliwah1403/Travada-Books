export function BillingSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold">Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your Travada Books subscription, plan, and payment history.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          Subscription management will be available when billing is enabled.
        </p>
      </div>
    </div>
  )
}
