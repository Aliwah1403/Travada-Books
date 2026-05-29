import { supabase } from "@/lib/supabase"

export async function updateOrg(
  orgId: string,
  data: {
    name?: string
    email?: string | null
    phone?: string | null
    tax_id?: string | null
    address_line1?: string | null
    base_currency?: string
    logo_url?: string | null
  },
) {
  const { error } = await supabase.from("organizations").update(data).eq("id", orgId)
  if (error) throw error
}

export async function uploadOrgLogo(orgId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png"
  const path = `logos/${orgId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("org-assets")
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("org-assets").getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
