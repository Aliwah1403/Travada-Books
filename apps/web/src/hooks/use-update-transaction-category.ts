import { toast } from "sonner"
import { findSimilarTransactions, bulkUpdateTransactions } from "@/lib/queries/transactions"
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries"

export function useUpdateTransactionCategory(orgId: string) {
  const invalidateTransactionQueries = useInvalidateTransactionQueries()

  async function updateCategoryWithSimilarPrompt(
    transactionId: string,
    matchName: string,
    counterpartyName: string | null,
    category: { id: string; name: string },
  ) {
    const similar = await findSimilarTransactions(
      orgId,
      transactionId,
      matchName,
      counterpartyName,
      category.id,
    )
    if (similar.length === 0) return

    toast.success("Category updated", {
      description: `Apply "${category.name}" to ${similar.length} similar transaction${similar.length > 1 ? "s" : ""}?`,
      duration: 8000,
      action: {
        label: "Apply",
        onClick: async () => {
          await bulkUpdateTransactions(similar.map((t) => t.id), orgId, { category_id: category.id })
          invalidateTransactionQueries()
          toast.success(`Updated ${similar.length} transactions`)
        },
      },
    })
  }

  return { updateCategoryWithSimilarPrompt }
}
