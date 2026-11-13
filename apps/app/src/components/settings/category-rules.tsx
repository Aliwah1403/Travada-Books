import { useState } from "react";
import { transactionWrites } from "@/lib/transaction-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { Delete01Icon } from "@travada-books/ui/icons";
import { useAuth } from "@/contexts/auth-context";
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries";
import { trackEvent, LogEvents } from "@/lib/analytics";
import {
  listCategoryRules,
  type CategoryRule,
} from "@/lib/queries/category-rules";
import type { TransactionCategory } from "@/lib/queries/transactions";

function RuleRow({
  rule,
  onDelete,
  disabled,
}: {
  rule: CategoryRule;
  onDelete: (rule: CategoryRule) => void;
  disabled: boolean;
}) {
  return (
    <div className='flex items-center gap-2.5 px-3 py-2.5'>
      <span className='min-w-0 flex-1 truncate text-xs font-medium'>
        {rule.pattern}
      </span>
      <span className='text-xs text-muted-foreground'>→</span>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <div
          className='size-2.5 shrink-0 rounded-full'
          style={{ backgroundColor: rule.category?.color ?? "#888" }}
        />
        <span className='truncate text-xs'>{rule.category?.name ?? "Unknown"}</span>
      </div>
      <button
        type='button'
        aria-label={`Delete rule ${rule.pattern}`}
        onClick={() => onDelete(rule)}
        disabled={disabled}
        className='shrink-0 text-muted-foreground transition-colors fine-hover:text-destructive disabled:opacity-40'
      >
        <Delete01Icon size={13} />
      </button>
    </div>
  );
}

export function CategoryRules({ categories }: { categories: TransactionCategory[] }) {
  const { orgId, user } = useAuth();
  const queryClient = useQueryClient();
  const invalidateTransactionQueries = useInvalidateTransactionQueries();
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["category-rules", orgId],
    queryFn: () => listCategoryRules(orgId!),
    enabled: !!orgId,
  });

  const trimmed = pattern.trim();
  const canAdd = trimmed.length >= 2 && !!categoryId && !adding;
  const selected = categories.find((c) => c.id === categoryId);

  function handleAdd() {
    if (!canAdd || !orgId || !user) return;
    setAdding(true);
    toast.promise(
      transactionWrites.createRule({ orgId, pattern: trimmed, categoryId, userId: user.id }),
      {
        loading: "Adding rule…",
        success: ({ appliedCount }) => {
          trackEvent(LogEvents.CategoryRuleCreated, {
            source: "settings",
            applied_count: appliedCount,
            pattern_length: trimmed.length,
          });
          setPattern("");
          setCategoryId("");
          setAdding(false);
          queryClient.invalidateQueries({ queryKey: ["category-rules", orgId] });
          if (appliedCount > 0) invalidateTransactionQueries();
          return appliedCount > 0 ?
              `Rule added. ${appliedCount} existing transaction${appliedCount === 1 ? "" : "s"} filed.`
            : "Rule added";
        },
        error: (err) => {
          setAdding(false);
          return err instanceof Error ? err.message : "Failed to add rule. Please try again.";
        },
      },
    );
  }

  function handleDelete(rule: CategoryRule) {
    setDeletingId(rule.id);
    toast.promise(transactionWrites.deleteRule(rule.id), {
      loading: "Deleting rule…",
      success: () => {
        trackEvent(LogEvents.CategoryRuleDeleted);
        setDeletingId(null);
        queryClient.invalidateQueries({ queryKey: ["category-rules", orgId] });
        invalidateTransactionQueries();
        return "Rule deleted";
      },
      error: () => {
        setDeletingId(null);
        return "Failed to delete rule. Please try again.";
      },
    });
  }

  return (
    <div className='flex flex-col gap-2'>
      <h3 className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
        Rules ({rules.length})
      </h3>
      <p className='text-xs text-muted-foreground'>
        Transactions containing this text always go in this category. Rules beat
        AI suggestions, never a category you picked yourself.
      </p>

      {isLoading ?
        <div className='rounded-lg border overflow-hidden divide-y'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className='flex items-center gap-2.5 px-3 py-2.5'>
              <div className='h-3 w-28 rounded bg-muted animate-pulse' />
              <div className='h-3 w-24 rounded bg-muted animate-pulse' />
            </div>
          ))}
        </div>
      : rules.length > 0 ?
        <div className='rounded-lg border overflow-hidden divide-y'>
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onDelete={handleDelete}
              disabled={deletingId === rule.id}
            />
          ))}
        </div>
      : <p className='rounded-lg border px-3 py-4 text-center text-xs text-muted-foreground'>
          No rules yet. Add one below, or pick "Always" after changing a category.
        </p>
      }

      <form
        className='flex flex-col gap-2 sm:flex-row sm:items-center'
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <Input
          placeholder='Text to match, e.g. Safaricom'
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className='text-xs'
        />
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
          <SelectTrigger className='w-full text-xs sm:w-48'>
            <SelectValue placeholder='Category'>
              {selected?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} className='text-xs'>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type='submit' variant='outline' size='sm' disabled={!canAdd}>
          Add
        </Button>
      </form>
    </div>
  );
}
