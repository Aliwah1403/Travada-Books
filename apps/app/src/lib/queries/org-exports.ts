import { supabase } from "@/lib/supabase"

export type OrgDataExport = {
  id: string
  org_id: string
  status: "processing" | "completed" | "failed"
  reason: "manual" | "org_deletion"
  item_count: number | null
  error: string | null
  created_at: string
}

const ORG_DATA_EXPORT_SELECT = "id, org_id, status, reason, item_count, error, created_at"

export async function getLatestOrgDataExport(orgId: string): Promise<OrgDataExport | null> {
  const { data, error } = await supabase
    .from("org_data_exports")
    .select(ORG_DATA_EXPORT_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as OrgDataExport | null
}

export async function triggerOrgDataExport(): Promise<{ exportId: string; emailTo: string }> {
  const { data, error } = await supabase.functions.invoke<{ exportId: string; emailTo: string }>(
    "export-org-data",
    { body: {} },
  )
  if (error) {
    let message = "Export request failed"
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch {
      // fall back to the generic message below
    }
    throw new Error(message)
  }
  if (!data) throw new Error("Export request failed")
  return data
}
