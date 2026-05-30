import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import type { Session, User } from "@supabase/supabase-js"
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
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  org: UserOrg | null
  orgId: string | null
  orgRole: "owner" | "member" | null
  orgLoading: boolean
  refreshOrg: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  org: null,
  orgId: null,
  orgRole: null,
  orgLoading: true,
  refreshOrg: async () => {},
  refreshProfile: async () => {},
})

async function fetchUserData(userId: string): Promise<{ profile: UserProfile | null; org: UserOrg | null; orgRole: "owner" | "member" | null }> {
  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, avatar_url, email, locale, timezone, date_format, time_format, week_starts_on_monday, timezone_auto_sync")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organizations(id, name, logo_url, base_currency, address_line1, address_line2, city, state, country_code, email, phone, tax_id)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ])

  if (profileResult.error) {
    console.error("[auth] fetchUserData: profile query failed", profileResult.error)
  }
  if (memberResult.error) {
    console.error("[auth] fetchUserData: org member query failed", memberResult.error)
  }

  const profile = profileResult.error ? null : (profileResult.data as UserProfile | null)
  const orgRaw = memberResult.error ? null : (memberResult.data?.organizations as UserOrg | null)
  const orgRole = memberResult.error ? null : ((memberResult.data?.role as "owner" | "member") ?? null)
  return { profile, org: orgRaw ?? null, orgRole }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [org, setOrg] = useState<UserOrg | null>(null)
  const [orgRole, setOrgRole] = useState<"owner" | "member" | null>(null)
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
      setOrg(result.org)
      setOrgRole(result.orgRole)
    } catch {
      // silently ignore — layout stays visible
    }
  }, [session?.user?.id])

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
        setOrgLoading(false)
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
      setOrgLoading(false)
      return
    }
    const fetchId = ++fetchIdRef.current
    setOrgLoading(true)
    fetchUserData(session.user.id)
      .then(({ profile, org, orgRole }) => {
        if (fetchId !== fetchIdRef.current) return
        setProfile(profile)
        setOrg(org)
        setOrgRole(orgRole)
        setOrgLoading(false)
      })
      .catch(() => {
        if (fetchId !== fetchIdRef.current) return
        setOrgLoading(false)
      })
  }, [session?.user?.id, loading])

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      profile,
      org,
      orgId: org?.id ?? null,
      orgRole,
      orgLoading,
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
