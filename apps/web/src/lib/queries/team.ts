import { supabase } from "@/lib/supabase"

export type TeamMember = {
  id: string
  user_id: string
  role: string
  created_at: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export type TeamInvitation = {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string | null
}

export async function listTeamMembers(orgId: string): Promise<TeamMember[]> {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("created_at")
  if (error) throw new Error(error.message)
  if (!members?.length) return []

  const userIds = members.map((m) => m.user_id).filter(Boolean) as string[]
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .in("id", userIds)

  return members.map((m) => {
    const u = users?.find((u) => u.id === m.user_id)
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      full_name: u?.full_name ?? null,
      email: u?.email ?? null,
      avatar_url: u?.avatar_url ?? null,
    }
  })
}

export async function listTeamInvitations(orgId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, email, role, created_at, expires_at")
    .eq("org_id", orgId)
    .eq("status", "invited")
    .order("created_at")
  if (error) throw new Error(error.message)
  return data ?? []
}

export type InviteInfo = {
  org_name: string
  email: string
  role: string
  status: string
  expires_at: string | null
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: "owner" | "member" = "member",
): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      org_id: orgId,
      email: email.trim().toLowerCase(),
      role,
      status: "invited",
      expires_at: expiresAt,
    })
    .select("id")
    .single()
  if (error) {
    if (error.code === "23505") throw new Error("This email has already been invited.")
    throw new Error(error.message)
  }
  return data.id
}

export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const { data, error } = await supabase.rpc("get_invite_info", { token })
  if (error) throw new Error(error.message)
  if (!data?.length) return null
  return data[0] as InviteInfo
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_invite", { token })
  if (error) throw new Error(error.message)
  return data as string
}

export async function renewInvitation(invitationId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from("organization_members")
    .update({ expires_at: expiresAt })
    .eq("id", invitationId)
  if (error) throw new Error(error.message)
}

export async function updateMemberRole(memberId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
  if (error) throw new Error(error.message)
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
  if (error) throw new Error(error.message)
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", invitationId)
  if (error) throw new Error(error.message)
}
