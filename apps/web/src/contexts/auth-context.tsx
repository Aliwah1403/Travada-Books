import { createContext, useContext, useEffect, useState, useCallback } from "react"
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
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  org: UserOrg | null
  orgId: string | null
  orgLoading: boolean
  refreshOrg: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  org: null,
  orgId: null,
  orgLoading: true,
  refreshOrg: async () => {},
})

async function fetchUserData(userId: string): Promise<{ profile: UserProfile | null; org: UserOrg | null }> {
  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, avatar_url, email, locale, timezone, date_format, time_format, week_starts_on_monday, timezone_auto_sync")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("organizations(id, name, logo_url, base_currency)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ])

  const profile = profileResult.data as UserProfile | null
  const orgRaw = memberResult.data?.organizations as UserOrg | null
  return { profile, org: orgRaw ?? null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [org, setOrg] = useState<UserOrg | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  const refreshOrg = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    setOrgLoading(true)
    const result = await fetchUserData(userId)
    setProfile(result.profile)
    setOrg(result.org)
    setOrgLoading(false)
  }, [session?.user?.id])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setOrg(null)
        setOrgLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    if (!session?.user) {
      setProfile(null)
      setOrg(null)
      setOrgLoading(false)
      return
    }
    setOrgLoading(true)
    fetchUserData(session.user.id).then(({ profile, org }) => {
      setProfile(profile)
      setOrg(org)
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
      orgLoading,
      refreshOrg,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
