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
  const { data, error } = await supabase
    .rpc("get_org_members", { p_org_id: orgId })
    .eq("status", "active")
    .order("created_at")
  if (error) throw new Error(error.message)
  if (!data?.length) return []

  return data.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    created_at: m.created_at,
    full_name: m.full_name ?? null,
    email: m.user_email ?? null,
    avatar_url: m.avatar_url ?? null,
  }))
}

export async function listTeamInvitations(orgId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .rpc("get_org_invitations", { p_org_id: orgId })
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
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from("organization_members")
    .insert({
      id,
      org_id: orgId,
      email: email.trim().toLowerCase(),
      role,
      status: "invited",
      expires_at: expiresAt,
    })
  if (error) {
    if (error.code === "23505") throw new Error("This email has already been invited.")
    throw new Error(error.message)
  }
  return id
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
  const { error } = await supabase.rpc("revoke_invitation", {
    invitation_id: invitationId,
  })
  if (error) throw new Error(error.message)
}
