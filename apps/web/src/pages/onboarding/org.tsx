import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
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
import { CurrencySelect } from "@travada-books/ui/components/currency-select"
import { CountryDropdown } from "@/components/country-dropdown"
import * as Sentry from "@sentry/react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export function OnboardingOrgPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isCreateMode = searchParams.get("mode") === "create"
  const { user, refreshOrg } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currency, setCurrency] = useState("KES")
  const [country, setCountry] = useState("KE")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError("")
    setLoading(true)

    const orgId = crypto.randomUUID()

    const { error: orgError } = await supabase
      .from("organizations")
      .insert({ id: orgId, name: name.trim(), email: email.trim(), base_currency: currency, country_code: country })

    if (orgError) {
      Sentry.captureException(orgError)
      setError("Failed to create your business. Please try again.")
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({ org_id: orgId, user_id: user.id, role: "owner", status: "active" })

    if (memberError) {
      Sentry.captureException(memberError)
      const { error: rbError } = await supabase.from("organizations").delete().eq("id", orgId)
      if (rbError) {
        console.error(`Rollback failed for org ${orgId}: ${rbError.message}`)
        Sentry.captureException(rbError, { extra: { context: "org_rollback_failed", orgId } })
      }
      setError("Failed to set up your account. Please try again.")
      setLoading(false)
      return
    }

    // Always set active_org_id so the new org becomes the active one
    const { error: updateError } = await supabase.from("users").update({ active_org_id: orgId }).eq("id", user.id)
    if (updateError) {
      Sentry.captureException(updateError)
      const { error: rbMemberError } = await supabase.from("organization_members").delete().eq("org_id", orgId).eq("user_id", user.id)
      if (rbMemberError) {
        console.error(`Rollback failed for membership org=${orgId} user=${user.id}: ${rbMemberError.message}`)
        Sentry.captureException(rbMemberError, { extra: { context: "membership_rollback_failed", orgId } })
      }
      const { error: rbOrgError } = await supabase.from("organizations").delete().eq("id", orgId)
      if (rbOrgError) {
        console.error(`Rollback failed for org ${orgId}: ${rbOrgError.message}`)
        Sentry.captureException(rbOrgError, { extra: { context: "org_rollback_failed", orgId } })
      }
      setError("Failed to set up your account. Please try again.")
      setLoading(false)
      return
    }

    // Seed system transaction categories — non-blocking, failure doesn't block onboarding
    const { error: seedError } = await supabase.rpc("seed_org_categories", { p_org_id: orgId })
    if (seedError) {
      console.warn("Failed to seed transaction categories:", seedError.message)
      Sentry.captureException(seedError, { extra: { context: "seed_org_categories", orgId } })
    }

    if (isCreateMode) {
      // Adding an additional org: refresh context then go to dashboard
      await refreshOrg()
      navigate("/invoices")
    } else {
      navigate("/onboarding/invite", { state: { orgId } })
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">
          {isCreateMode ? "Create a new organization" : "Tell us about your business"}
        </CardTitle>
        <CardDescription>This is how your invoices will be identified</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              placeholder="Acme Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Business email</Label>
            <Input
              id="email"
              type="email"
              placeholder="billing@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Used as the reply-to address on invoice and quote emails sent to clients.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Base currency</Label>
            <CurrencySelect value={currency} onValueChange={setCurrency} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <CountryDropdown
              value={country}
              onChange={(c) => setCountry(c.alpha2)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
