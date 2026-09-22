import { supabase } from "@/lib/supabase"

export type OnboardingChecklistStatus = {
  business_profile: boolean
  first_customer: boolean
  first_invoice: boolean
  first_payment: boolean
  first_expense: boolean
}

// ─── Onboarding checklist ───────────────────────────────────────────────────
// Always one row (zeros/false for a brand-new org) — get_onboarding_checklist
// always returns exactly one row, but PostgREST still wraps RETURNS TABLE
// output in an array, so unwrap it here rather than downstream.

export async function getOnboardingChecklist(orgId: string): Promise<OnboardingChecklistStatus> {
  const { data, error } = await supabase.rpc("get_onboarding_checklist", { p_org_id: orgId })
  if (error) throw error
  return (
    data?.[0] ?? {
      business_profile: false,
      first_customer: false,
      first_invoice: false,
      first_payment: false,
      first_expense: false,
    }
  )
}

export async function dismissOnboardingChecklist(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ onboarding_checklist_dismissed_at: new Date().toISOString() })
    .eq("id", userId)
  if (error) throw error
}
