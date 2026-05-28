import { useState } from "react"
import { useNavigate, useLocation, Navigate } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@travada-books/ui/components/card"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

const MAX_INVITES = 2

export function OnboardingInvitePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { refreshOrg, profile, org } = useAuth()

  const orgId: string | undefined = state?.orgId
  if (!orgId) return <Navigate to="/onboarding/org" replace />

  const [emails, setEmails] = useState<string[]>([""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function updateEmail(index: number, value: string) {
    setEmails((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addEmail() {
    if (emails.length < MAX_INVITES) setEmails((prev) => [...prev, ""])
  }

  function removeEmail(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index))
  }

  async function finish() {
    await refreshOrg()
    navigate("/invoices", { replace: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).filter(Boolean)

    if (validEmails.length === 0) {
      await finish()
      return
    }

    setError("")
    setLoading(true)

    const rows = validEmails.map((email) => ({
      org_id: orgId,
      email,
      role: "viewer" as const,
      status: "invited" as const,
    }))

    const { error: insertError } = await supabase.from("organization_members").insert(rows)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const inviterName = profile?.full_name || org?.name || ""
    supabase.functions.invoke("invite-member", { body: { emails: validEmails, inviterName } }).catch(() => {})

    await finish()
  }

  async function handleSkip() {
    await finish()
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">Invite your team</CardTitle>
        <CardDescription>
          Add up to {MAX_INVITES} more people — or skip and do it later from Settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {emails.map((email, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`email-${i}`}>Email address</Label>
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(i)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Input
                  id={`email-${i}`}
                  type="email"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                  autoFocus={i === 0}
                />
              </div>
            ))}
          </div>

          {emails.length < MAX_INVITES && (
            <button
              type="button"
              onClick={addEmail}
              className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              + Add another
            </button>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending invites…" : "Send invites"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
