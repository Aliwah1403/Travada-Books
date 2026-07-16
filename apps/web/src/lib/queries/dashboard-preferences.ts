import { supabase } from "@/lib/supabase"

export type DashboardPreferences = {
  primary_widgets: string[]
}

export async function getDashboardPreferences(orgId: string, userId: string): Promise<DashboardPreferences | null> {
  const { data, error } = await supabase
    .from("dashboard_preferences")
    .select("primary_widgets")
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
