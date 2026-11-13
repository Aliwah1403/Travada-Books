import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { findSimilarTransactions } from "@/lib/queries/transactions"
import { transactionWrites } from "@/lib/transaction-api"
import {
  listCategoryRules,
  normalizeRulePattern,
} from "@/lib/queries/category-rules"
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries"
import { useAuth } from "@/contexts/auth-context"
import { trackEvent, LogEvents } from "@/lib/analytics"

export function useUpdateTransactionCategory(orgId: string) {
  const invalidateTransactionQueries = useInvalidateTransactionQueries()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Offer to turn this correction into a rule, unless one already uses the text.
  async function getRuleOffer(pattern: string, category: { id: string; name: string }) {
    const text = pattern.trim()
    if (!user || !orgId || text.length < 2) return null
    try {
      const rules = await queryClient.fetchQuery({
        queryKey: ["category-rules", orgId],
        queryFn: () => listCategoryRules(orgId),
        staleTime: 60_000,
      })
      if (rules.some((r) => normalizeRulePattern(r.pattern) === normalizeRulePattern(text))) return null
    } catch {
      return null
    }

    return async () => {
      try {
        const { appliedCount } = await transactionWrites.createRule({
          orgId,
          pattern: text,
          categoryId: category.id,
          userId: user.id,
        })
        trackEvent(LogEvents.CategoryRuleCreated, {
          source: "transaction_prompt",
          applied_count: appliedCount,
          pattern_length: text.length,
        })
        queryClient.invalidateQueries({ queryKey: ["category-rules", orgId] })
        invalidateTransactionQueries()
        toast.success(
          appliedCount > 0
            ? `Rule added. ${appliedCount} existing transaction${appliedCount === 1 ? "" : "s"} filed.`
            : "Rule added",
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add rule")
      }
    }
  }

  async function updateCategoryWithSimilarPrompt(
    transactionId: string,
    matchName: string,
    counterpartyName: string | null,
    category: { id: string; name: string },
  ) {
    const [similar, addRule] = await Promise.all([
      findSimilarTransactions(orgId, transactionId, matchName, counterpartyName, category.id),
      getRuleOffer(counterpartyName?.trim() || matchName, category),
    ])
    if (similar.length === 0 && !addRule) return

    const ruleText = (counterpartyName?.trim() || matchName).trim()

    // One toast, not two. With similar transactions: "Apply" stays the primary
    // action and "Always" rides along as the secondary button. Without: "Always"
    // is the only action. Rules cover future and uncategorized rows; "Apply"
    // overwrites already-categorized look-alikes, so the two aren't redundant.
    const apply = async () => {
      await transactionWrites.bulkUpdate(similar.map((t) => t.id), orgId, { category_id: category.id })
      invalidateTransactionQueries()
      toast.success(`Updated ${similar.length} transactions`)
    }

    if (addRule) trackEvent(LogEvents.CategoryRulePromptShown)

    if (similar.length === 0 && addRule) {
      toast.success("Category updated", {
        description: `Always file "${ruleText}" under ${category.name}?`,
        duration: 8000,
        action: { label: "Always", onClick: addRule },
      })
      return
    }

    toast.success("Category updated", {
      description: `Apply "${category.name}" to ${similar.length} similar transaction${similar.length > 1 ? "s" : ""}?${
        addRule ? ` Or always file "${ruleText}" there.` : ""
      }`,
      duration: addRule ? 10000 : 8000,
      action: { label: "Apply", onClick: apply },
      ...(addRule ? { cancel: { label: "Always", onClick: addRule } } : {}),
    })
  }

  return { updateCategoryWithSimilarPrompt }
}
