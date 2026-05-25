import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: POST /api/auth/forgot-password { email }
    navigate("/forgot-password/verify", { state: { email } })
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a one-time code
        </CardDescription>
      </CardHeader>
      <CardContent>
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

          <Button type="submit" className="w-full">
            Send code
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
