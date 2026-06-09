import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import type { Session, User } from "@supabase/supabase-js"
import posthog from "posthog-js"
import * as Sentry from "@sentry/react"
import { supabase } from "@/lib/supabase"

export type UserProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  locale: string
  timezone: string
  date_format: string
  time_format: string
  week_starts_on_monday: boolean
  timezone_auto_sync: boolean
}

export type UserOrg = {
  id: string
  name: string
  logo_url: string | null
  base_currency: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  country_code: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  zip: string | null
}

export type UserOrgMembership = {
  org: UserOrg
  role: "owner" | "member"
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  avatarUrl: string | null
  org: UserOrg | null
  orgId: string | null
  orgRole: "owner" | "member" | null
  orgs: UserOrgMembership[]
  orgLoading: boolean
  switchOrg: (orgId: string) => Promise<void>
  refreshOrg: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  avatarUrl: null,
  org: null,
  orgId: null,
  orgRole: null,
  orgs: [],
  orgLoading: true,
  switchOrg: async () => {},
  refreshOrg: async () => {},
  refreshProfile: async () => {},
})

type FetchResult = {
  profile: UserProfile | null
  orgs: UserOrgMembership[]
  activeOrg: UserOrg | null
  activeRole: "owner" | "member" | null
}

async function fetchUserData(userId: string): Promise<FetchResult> {
  const [profileResult, membersResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, avatar_url, email, locale, timezone, date_format, time_format, week_starts_on_monday, timezone_auto_sync, active_org_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organizations(id, name, logo_url, base_currency, address_line1, address_line2, city, state, country_code, email, phone, tax_id, zip)")
      .eq("user_id", userId)
      .eq("status", "active"),
  ])

  if (profileResult.error) {
    console.error("[auth] fetchUserData: profile query failed", profileResult.error)
  }
  if (membersResult.error) {
    console.error("[auth] fetchUserData: members query failed", membersResult.error)
  }

  const profile = profileResult.error ? null : (profileResult.data as (UserProfile & { active_org_id: string | null }) | null)
  const activeOrgId = profile?.active_org_id ?? null

  const rawMembers = membersResult.error ? [] : (membersResult.data ?? [])
  const orgs: UserOrgMembership[] = rawMembers
    .filter((m) => m.organizations != null)
    .map((m) => ({
      org: m.organizations as UserOrg,
      role: m.role as "owner" | "member",
    }))

  // Find active org: DB active_org_id → localStorage backup → first membership
  const localOrgId = localStorage.getItem("travada:active_org_id")
  const activeMembership =
    orgs.find((m) => m.org.id === activeOrgId) ??
    orgs.find((m) => m.org.id === localOrgId) ??
    orgs[0] ??
    null

  // Only bootstrap active_org_id when it has never been set (null).
  // Never overwrite a non-null value — the stored ID might be valid but simply
  // absent from this query due to a transient RLS evaluation, which would
  // permanently lock the user into the wrong org.
  if (activeMembership && activeOrgId === null) {
    supabase
      .from("users")
      .update({ active_org_id: activeMembership.org.id })
      .eq("id", userId)
      .then()
  }

  return {
    profile: profile ? { ...profile } : null,
    orgs,
    activeOrg: activeMembership?.org ?? null,
    activeRole: activeMembership?.role ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [org, setOrg] = useState<UserOrg | null>(null)
  const [orgRole, setOrgRole] = useState<"owner" | "member" | null>(null)
  const [orgs, setOrgs] = useState<UserOrgMembership[]>([])
  const [orgLoading, setOrgLoading] = useState(true)
  const fetchIdRef = useRef(0)

  const refreshOrg = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    const fetchId = ++fetchIdRef.current
    try {
      const result = await fetchUserData(userId)
      if (fetchId !== fetchIdRef.current) return
      setProfile(result.profile)
      setOrgs(result.orgs)
      setOrg(result.activeOrg)
      setOrgRole(result.activeRole)
    } catch {
      // silently ignore — layout stays visible
    }
  }, [session?.user?.id])

  const switchOrg = useCallback(async (orgId: string) => {
    const userId = session?.user?.id
    if (!userId) return
    const target = orgs.find((m) => m.org.id === orgId)
    if (!target) return
    await supabase.from("users").update({ active_org_id: orgId }).eq("id", userId)
    localStorage.setItem("travada:active_org_id", orgId)
    setOrg(target.org)
    setOrgRole(target.role)
    // All React Query queries are keyed on orgId — they refetch automatically when orgId changes.
  }, [session?.user?.id, orgs])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    const fetchId = ++fetchIdRef.current
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, email, locale, timezone, date_format, time_format, week_starts_on_monday, timezone_auto_sync")
      .eq("id", userId)
      .maybeSingle()
    if (fetchId !== fetchIdRef.current) return
    if (data) setProfile(data as UserProfile)
  }, [session?.user?.id])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        fetchIdRef.current++
        setProfile(null)
        setOrg(null)
        setOrgRole(null)
        setOrgs([])
        setOrgLoading(false)
        localStorage.removeItem("travada:active_org_id")
        posthog.reset()
        if (import.meta.env.PROD) {
          Sentry.setUser(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    if (!session?.user) {
      fetchIdRef.current++
      setProfile(null)
      setOrg(null)
      setOrgRole(null)
      setOrgs([])
      setOrgLoading(false)
      return
    }
    const fetchId = ++fetchIdRef.current
    setOrgLoading(true)
    fetchUserData(session.user.id)
      .then(({ profile, orgs, activeOrg, activeRole }) => {
        if (fetchId !== fetchIdRef.current) return
        setProfile(profile)
        setOrgs(orgs)
        setOrg(activeOrg)
        setOrgRole(activeRole)
        setOrgLoading(false)

        posthog.identify(session.user.id, {
          org_id: activeOrg?.id,
        })
        if (import.meta.env.PROD) {
          Sentry.setUser({ id: session.user.id })
        }

        const metaAvatarUrl =
          (session.user.user_metadata?.avatar_url as string | undefined) ??
          (session.user.user_metadata?.picture as string | undefined) ??
          null
        if (!profile?.avatar_url && metaAvatarUrl) {
          supabase
            .from("users")
            .update({ avatar_url: metaAvatarUrl })
            .eq("id", session.user.id)
            .then(() => refreshProfile())
        }
      })
      .catch(() => {
        if (fetchId !== fetchIdRef.current) return
        setOrgLoading(false)
      })
  }, [session?.user?.id, loading])

  const user = session?.user ?? null
  const googleAvatarUrl = (user?.user_metadata?.avatar_url as string | undefined)
    ?? (user?.user_metadata?.picture as string | undefined)
    ?? null
  const avatarUrl = profile?.avatar_url ?? googleAvatarUrl

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      avatarUrl,
      org,
      orgId: org?.id ?? null,
      orgRole,
      orgs,
      orgLoading,
      switchOrg,
      refreshOrg,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
