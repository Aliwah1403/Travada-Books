import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { getInboxItem, type InboxItem } from "@/lib/queries/inbox"
import { SuggestedMatch } from "@/components/inbox/suggested-match"
import { MatchTransaction } from "@/components/inbox/match-transaction"

const ANALYZING_STATUSES: InboxItem["status"][] = ["analyzing"]

/**
 * Chooses between the suggested-match card and the manual matcher, mirroring
 * Midday: 'other' items (non-financial docs) get no matching UI at all; an
 * item with a live pending suggestion and no confirmed transaction yet shows
 * SuggestedMatch; everything else (already matched, or no suggestion) shows
 * MatchTransaction, which itself renders the unmatch row when already matched.
 */
export function InboxActions({ item }: { item: InboxItem }) {
  const { orgId } = useAuth()

  const { data: detail } = useQuery({
    queryKey: ["inbox-item", item.id],
    queryFn: () => getInboxItem(item.id),
    enabled: !!item.id,
    // Poll while the matcher is running so the suggestion appears without
    // the user having to click away and back.
    refetchInterval: ANALYZING_STATUSES.includes(item.status) ? 3000 : false,
  })

  if (item.type === "other" || !orgId) return null

  const suggestion = detail?.suggestion ?? null

  if (suggestion && suggestion.status === "pending" && !item.transaction_id) {
    return <SuggestedMatch item={item} suggestion={suggestion} orgId={orgId} />
  }

  return <MatchTransaction item={item} orgId={orgId} />
}
