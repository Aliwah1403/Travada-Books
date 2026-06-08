import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@travada-books/ui/components/card"
import * as Sentry from "@sentry/react"
import { useAuth } from "@/contexts/auth-context"
import { getInviteInfo, acceptInvite, type InviteInfo } from "@/lib/queries/team"
import { supabase } from "@/lib/supabase"

type State =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "expired"; info: InviteInfo }
  | { kind: "already_accepted" }
  | { kind: "ready"; info: InviteInfo }
  | { kind: "accepting" }
  | { kind: "email_mismatch"; info: InviteInfo }
  | { kind: "error"; message: string }

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const token = searchParams.get("token") ?? ""

  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    if (!token) {
      setState({ kind: "not_found" })
      return
    }
    getInviteInfo(token).then((info) => {
      if (!info) return setState({ kind: "not_found" })
      if (info.status !== "invited") return setState({ kind: "already_accepted" })
      if (info.expires_at && new Date(info.expires_at) < new Date()) {
        return setState({ kind: "expired", info })
      }
      setState({ kind: "ready", info })
    }).catch((err: unknown) => {
      console.error("getInviteInfo failed:", err)
      Sentry.captureException(err)
      setState({ kind: "error", message: "Failed to load invite. Please try again." })
    })
  }, [token])

  // Auto-accept when user is logged in and invite is ready
  useEffect(() => {
    if (authLoading || !user || state.kind !== "ready") return
    const info = state.info
    setState({ kind: "accepting" })
    acceptInvite(token)
      .then(async (orgId) => {
        sessionStorage.removeItem("pendingInviteToken")
        // Set the newly joined org as active
        if (user) {
          await supabase.from("users").update({ active_org_id: orgId }).eq("id", user.id)
        }
        // Fire-and-forget — token IS the organization_members UUID (the memberId)
        supabase.functions
          .invoke("notify-team-joined", { body: { memberId: token } })
          .catch((err) => console.error("notify-team-joined failed:", err))
        // Hard redirect so auth-context re-initialises fresh with the new membership
        window.location.replace("/invoices")
      })
      .catch((err: Error) => {
        sessionStorage.removeItem("pendingInviteToken")
        if (err.message === "email_mismatch") {
          setState({ kind: "email_mismatch", info })
        } else if (err.message === "already_accepted") {
          setState({ kind: "already_accepted" })
        } else {
          Sentry.captureException(err)
          setState({ kind: "error", message: "Something went wrong. Please try again or contact support." })
        }
      })
  }, [authLoading, user, state.kind, token])

  const nextParam = encodeURIComponent(`/accept-invite?token=${token}`)

  if (state.kind === "loading" || state.kind === "accepting") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">
          {state.kind === "accepting" ? "Joining team…" : "Loading…"}
        </p>
      </div>
    )
  }

  if (state.kind === "not_found") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-base">Invalid invitation</CardTitle>
            <CardDescription>
              This invite link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.kind === "already_accepted") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-base">Already a member</CardTitle>
            <CardDescription>This invitation has already been accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/invoices")}>
              Go to app
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.kind === "expired") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-base">Invitation expired</CardTitle>
            <CardDescription>
              This invite to <strong>{state.info.org_name}</strong> has expired. Ask the team owner to send a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.kind === "email_mismatch") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-base">Wrong account</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{state.info.email}</strong>. Please sign in with that email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="w-full" onClick={async () => {
              await supabase.auth.signOut({ scope: "local" })
              navigate(`/login?next=${nextParam}`)
            }}>
              Sign in with the right account
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/invoices")}>
              Continue to app
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-base">Something went wrong</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // state.kind === "ready" and user is not logged in
  const { info } = state
  const roleName = info.role === "owner" ? "Owner" : "Member"

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-base">You&apos;ve been invited</CardTitle>
          <CardDescription>
            Join <strong>{info.org_name}</strong> on Travada Books as a{" "}
            <strong>{roleName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              sessionStorage.setItem("pendingInviteToken", token)
              navigate(`/login?next=${nextParam}&email=${encodeURIComponent(info.email)}`)
            }}
          >
            Sign in to accept
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              sessionStorage.setItem("pendingInviteToken", token)
              navigate(`/signup?next=${nextParam}&email=${encodeURIComponent(info.email)}`)
            }}
          >
            Create account to accept
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-1">
            Invite sent to {info.email}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
