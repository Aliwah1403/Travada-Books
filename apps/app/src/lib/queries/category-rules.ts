import { supabase } from "@/lib/supabase"

export type CategoryRule = {
  id: string
  org_id: string
  pattern: string
  category_id: string
  created_by: string | null
  created_at: string
  category: { id: string; name: string; color: string | null } | null
}

const RULE_SELECT = `
  id, org_id, pattern, category_id, created_by, created_at,
  category:transaction_categories(id, name, color)
`

export async function listCategoryRules(orgId: string): Promise<CategoryRule[]> {
  const { data, error } = await supabase
    .from("transaction_category_rules")
    .select(RULE_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CategoryRule[]
}

/** Same normalisation as the DB's unique index: lower(btrim(pattern)). */
export function normalizeRulePattern(pattern: string): string {
  return pattern.trim().toLowerCase()
}

export async function createCategoryRule(input: {
  orgId: string
  pattern: string
  categoryId: string
  userId: string
}): Promise<{ rule: CategoryRule; appliedCount: number }> {
  const { data, error } = await supabase
    .from("transaction_category_rules")
    .insert({
      org_id: input.orgId,
      pattern: input.pattern.trim(),
      category_id: input.categoryId,
      created_by: input.userId,
    })
    .select(RULE_SELECT)
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("A rule for that text already exists")
    throw error
  }
  const rule = data as unknown as CategoryRule

  const { data: applied, error: applyError } = await supabase.rpc("apply_category_rule", {
    p_rule_id: rule.id,
  })
  if (applyError) throw applyError

  return { rule, appliedCount: (applied as number | null) ?? 0 }
}

export async function deleteCategoryRule(id: string): Promise<void> {
  const { error } = await supabase.from("transaction_category_rules").delete().eq("id", id)
  if (error) throw error
}
