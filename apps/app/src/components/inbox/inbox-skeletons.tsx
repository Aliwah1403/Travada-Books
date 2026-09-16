export function InboxListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b px-4 py-3">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function InboxDetailsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
