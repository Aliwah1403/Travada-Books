import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import * as Sentry from "@sentry/react"
import { supabase } from "@/lib/supabase"
import { Turnstile, TURNSTILE_ENABLED } from "@/components/turnstile"
import { AuthScreenHeader } from "@/components/auth/auth-screen-header"

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(captchaToken ? { captchaToken } : {}),
    })
    setLoading(false)
    if (error) {
      Sentry.captureException(error)
      setError("Failed to send reset code. Please try again.")
      return
    }
    sessionStorage.setItem("fp_email", email)
    navigate("/forgot-password/verify")
  }

  return (
    <div>
      <AuthScreenHeader
        eyebrow="Forgot password"
        title="Reset your password"
        description="Enter your email and we'll send you a one-time code"
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Turnstile onVerify={setCaptchaToken} />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || (TURNSTILE_ENABLED && !captchaToken)}>
          {loading ? "Sending…" : "Send code"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="text-foreground underline-offset-4 fine-hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
