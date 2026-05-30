import { supabase } from "@/lib/supabase"

export async function updateUserProfile(
  userId: string,
  data: { full_name?: string | null },
) {
  const { error } = await supabase.from("users").update(data).eq("id", userId)
  if (error) throw error
}

export async function updateUserRegional(
  userId: string,
  data: {
    timezone?: string
    date_format?: string
    time_format?: string
    timezone_auto_sync?: boolean
  },
) {
  const { error } = await supabase.from("users").update(data).eq("id", userId)
  if (error) throw error
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  // Bust cache so the browser re-fetches the new image
  return `${data.publicUrl}?t=${Date.now()}`
}
