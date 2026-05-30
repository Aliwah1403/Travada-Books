import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Separator } from "@travada-books/ui/components/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { supabase } from "@/lib/supabase"

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/invoices` },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const next = searchParams.get("next") ?? ""
    let emailRedirectTo: string | undefined
    try {
      const resolved = new URL(decodeURIComponent(next), window.location.origin)
      if (resolved.origin === window.location.origin && resolved.pathname === "/accept-invite") {
        emailRedirectTo = resolved.toString()
      }
    } catch {
      // malformed next param — ignore
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(next ? decodeURIComponent(next) : "/invoices")
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">Create your account</CardTitle>
        <CardDescription>Get started with Travada Books for free</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button variant="outline" className="w-full gap-2" type="button" onClick={handleGoogleSignIn}>
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
