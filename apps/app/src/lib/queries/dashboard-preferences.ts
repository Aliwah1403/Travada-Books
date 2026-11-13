import { supabase } from "@/lib/supabase"

export type DashboardPreferences = {
  primary_widgets: string[]
  /** Overview grid layout; validate with `parseDashboardLayout` before use. */
  layout: unknown | null
}

export async function getDashboardPreferences(orgId: string, userId: string): Promise<DashboardPreferences | null> {
  const { data, error } = await supabase
    .from("dashboard_preferences")
    .select("primary_widgets, layout")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertDashboardPreferences(
  orgId: string,
  userId: string,
  primaryWidgets: string[],
): Promise<void> {
  const { error } = await supabase
    .from("dashboard_preferences")
    .upsert(
      { org_id: orgId, user_id: userId, primary_widgets: primaryWidgets, updated_at: new Date().toISOString() },
      { onConflict: "org_id,user_id" },
    )
  if (error) throw error
}

/** Saves the Overview grid. Writes `layout` only — `primary_widgets` is left for older clients. */
export async function upsertDashboardLayout(orgId: string, userId: string, layout: unknown): Promise<void> {
  const { error } = await supabase
    .from("dashboard_preferences")
    .upsert(
      { org_id: orgId, user_id: userId, layout, updated_at: new Date().toISOString() },
      { onConflict: "org_id,user_id" },
    )
  if (error) throw error
}
