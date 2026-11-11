export type CategoryRule = {
  id: string;
  pattern: string;
  category_id: string;
  created_at: string;
};

/**
 * Mirrors SQL `match_category_rule`: case-insensitive substring match of the
 * trimmed pattern against name + original_name + counterparty, longest pattern
 * first, oldest rule breaking ties.
 */
export function matchCategoryRule(
  rules: CategoryRule[],
  fields: { name?: string | null; original_name?: string | null; counterparty_name?: string | null },
): CategoryRule | null {
  const haystack = [fields.name, fields.original_name, fields.counterparty_name]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  if (!haystack) return null;

  let best: { rule: CategoryRule; pattern: string } | null = null;
  for (const rule of rules) {
    const pattern = rule.pattern.trim().toLowerCase();
    if (!pattern || !haystack.includes(pattern)) continue;
    if (
      !best ||
      pattern.length > best.pattern.length ||
      (pattern.length === best.pattern.length && rule.created_at < best.rule.created_at)
    ) {
      best = { rule, pattern };
    }
  }
  return best?.rule ?? null;
}
