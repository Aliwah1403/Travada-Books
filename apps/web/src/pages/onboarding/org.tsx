import { useState } from "react"
import { useNavigate } from "react-router"
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

const CURRENCIES = [
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "TZS", label: "TZS — Tanzanian Shilling" },
  { code: "UGX", label: "UGX — Ugandan Shilling" },
  { code: "ETB", label: "ETB — Ethiopian Birr" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "GHS", label: "GHS — Ghanaian Cedi" },
  { code: "RWF", label: "RWF — Rwandan Franc" },
]

const COUNTRIES = [
  { code: "KE", label: "Kenya" },
  { code: "TZ", label: "Tanzania" },
  { code: "UG", label: "Uganda" },
  { code: "ET", label: "Ethiopia" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "GH", label: "Ghana" },
  { code: "RW", label: "Rwanda" },
  { code: "ZM", label: "Zambia" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
]

export function OnboardingOrgPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

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
      setError(orgError.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({ org_id: orgId, user_id: user.id, role: "owner", status: "active" })

    if (memberError) {
      const { error: rbError } = await supabase.from("organizations").delete().eq("id", orgId)
      if (rbError) {
        console.error(`Rollback failed for org ${orgId}: ${rbError.message}`)
        setError(`${memberError.message} (rollback failed: ${rbError.message})`)
      } else {
        setError(memberError.message)
      }
      setLoading(false)
      return
    }

    navigate("/onboarding/invite", { state: { orgId } })
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">Tell us about your business</CardTitle>
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
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
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
