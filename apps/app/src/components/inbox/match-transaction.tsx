import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Popover, PopoverContent, PopoverTrigger } from "@travada-books/ui/components/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@travada-books/ui/components/command"
import { Link04Icon, Unlink02Icon } from "@travada-books/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/format"
import {
  matchTransaction,
  unmatchTransaction,
  searchTransactionMatch,
  type InboxItem,
} from "@/lib/queries/inbox"
import { TransactionMatchItem } from "@/components/inbox/transaction-match-item"

// Same one-time toast as SuggestedMatch — manual matches also feed
// merchant-pattern learning, so the copy applies here too.
const LEARNING_TOAST_KEY = "travada:inbox-match-learning-toast-seen"

function maybeShowLearningToast() {
  if (typeof window === "undefined") return
  if (localStorage.getItem(LEARNING_TOAST_KEY)) return
  localStorage.setItem(LEARNING_TOAST_KEY, "1")
  toast("Travada learns from your confirmations", {
    description: "Matches from this vendor will get faster and more accurate over time.",
  })
}

type Props = {
  item: InboxItem
  orgId: string
}

export function MatchTransaction({ item, orgId }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(handle)
  }, [search])

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["inbox-match-search", orgId, item.id, debouncedSearch],
    queryFn: () => searchTransactionMatch(orgId, debouncedSearch, { amount: item.amount, date: item.date }),
    enabled: open,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["inbox", orgId] })
    queryClient.invalidateQueries({ queryKey: ["inbox-item", item.id] })
  }

  const matchMutation = useMutation({
    mutationFn: (transactionId: string) => matchTransaction(item.id, transactionId, orgId, user!.id),
    onSuccess: () => {
      invalidate()
      maybeShowLearningToast()
    },
  })

  const unmatchMutation = useMutation({
    mutationFn: () => unmatchTransaction(item.id),
    onSuccess: invalidate,
  })

  function handleSelect(transactionId: string) {
    setOpen(false)
    setSearch("")
    toast.promise(matchMutation.mutateAsync(transactionId), {
      loading: "Matching transaction…",
      success: "Matched to transaction",
      error: "Failed to match transaction",
    })
  }

  function handleUnmatch() {
    toast.promise(unmatchMutation.mutateAsync(), {
      loading: "Unmatching…",
      success: "Unmatched",
      error: "Failed to unmatch",
    })
  }

  if (item.transaction_id && item.transaction) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{item.transaction.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatCurrency(item.transaction.amount, item.transaction.currency)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnmatch}
          disabled={unmatchMutation.isPending}
          className="shrink-0 gap-1.5"
        >
          <Unlink02Icon size={12} />
          Unmatch
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed px-3 text-xs text-muted-foreground transition-colors fine-hover:text-foreground fine-hover:border-foreground/30"
          />
        }
      >
        <Link04Icon size={13} />
        Match to transaction
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search transactions…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-3 text-xs text-muted-foreground">Searching…</div>
            ) : candidates.length === 0 ? (
              <CommandEmpty>No transactions found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {candidates.map((tx) => (
                  <TransactionMatchItem key={tx.id} transaction={tx} onSelect={() => handleSelect(tx.id)} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
