import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { VaultIcon } from "@travada-books/ui/icons"
import { WidgetCard, WidgetSkeleton, WidgetError } from "@/components/dashboard/widget-card"
import { EmptyState } from "@/components/shared/empty-state"
import { listDocuments } from "@/lib/queries/vault"

const STALE_TIME = 2 * 60 * 1000
const RECENT_COUNT = 5

type VaultActivityWidgetProps = {
  orgId: string
}

export function VaultActivityWidget({ orgId }: VaultActivityWidgetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "vault_documents"],
    queryFn: () => listDocuments(orgId),
    staleTime: STALE_TIME,
  })

  if (isLoading) return <WidgetSkeleton />
  if (isError) return <WidgetError title="Vault Activity" icon={VaultIcon} onRetry={() => refetch()} />

  const recent = (data ?? []).slice(0, RECENT_COUNT)

  if (recent.length === 0) {
    return (
      <WidgetCard title="Vault Activity" icon={VaultIcon} to="/vault">
        <EmptyState icon={VaultIcon} title="No documents yet" compact />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="Vault Activity" icon={VaultIcon} to="/vault">
      <ul className="flex flex-col gap-1">
        {recent.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-2 px-1 -mx-1 py-0.5 text-xs">
            <span className="truncate text-muted-foreground">{doc.title ?? doc.name}</span>
            <span className="shrink-0 text-muted-foreground/70">
              {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
