export function TeamSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold">Team</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Invite members and assign roles — Owner, Accountant, Sender, or Viewer.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          Team management will be available in a future update.
        </p>
      </div>
    </div>
  )
}
