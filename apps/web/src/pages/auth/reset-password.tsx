import { useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { EyeIcon, EyeOffIcon } from "@travada-books/ui/icons"

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { email, otp } = (location.state as { email?: string; otp?: string }) ?? {}

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setError("")
    // TODO: POST /api/auth/reset-password { email, otp, password }
    navigate("/login")
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-base">Create new password</CardTitle>
        <CardDescription>
          Your new password must be at least 8 characters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full">
            Set new password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
