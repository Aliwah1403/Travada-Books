import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { UserIdentity } from "@supabase/supabase-js"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

const GoogleIcon = () => (
  <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

export function SecurityPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword) throw new Error("Please enter a new password.")
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.")
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.")

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (authError) throw new Error("Current password is incorrect.")

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Password updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const { data: identities = [] } = useQuery({
    queryKey: ["user-identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities()
      if (error) throw error
      return data.identities
    },
  })

  const googleIdentity = identities.find((i) => i.provider === "google") as UserIdentity | undefined
  const canUnlink = identities.length > 1

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/account/security` },
      })
      if (error) throw error
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!googleIdentity) return
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Google account disconnected.")
      queryClient.invalidateQueries({ queryKey: ["user-identities"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  return (
    <div className='flex flex-col gap-8'>
      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Change Password</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Update your account password.
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='current-password'>Current password</Label>
            <Input
              id='current-password'
              type='password'
              placeholder='••••••••'
              className='w-72'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='new-password'>New password</Label>
            <Input
              id='new-password'
              type='password'
              placeholder='••••••••'
              className='w-72'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='confirm-password'>Confirm new password</Label>
            <Input
              id='confirm-password'
              type='password'
              placeholder='••••••••'
              className='w-72'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <Button
          size='sm'
          className='w-fit'
          onClick={() => passwordMutation.mutate()}
          disabled={passwordMutation.isPending}
        >
          {passwordMutation.isPending ? "Updating…" : "Update password"}
        </Button>
      </section>

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Connected accounts</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Link a Google account to sign in without a password.
          </p>
        </div>

        <div className='flex items-center justify-between rounded-lg border px-4 py-3'>
          <div className='flex items-center gap-3'>
            <GoogleIcon />
            <div className='flex flex-col'>
              <span className='text-sm font-medium'>Google</span>
              {googleIdentity ? (
                <span className='text-xs text-muted-foreground'>
                  {googleIdentity.identity_data?.email ?? "Connected"}
                </span>
              ) : (
                <span className='text-xs text-muted-foreground'>Not connected</span>
              )}
            </div>
          </div>

          {googleIdentity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='size-8 text-muted-foreground'>
                  <svg className='size-4' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                    <circle cx='5' cy='12' r='1.5' />
                    <circle cx='12' cy='12' r='1.5' />
                    <circle cx='19' cy='12' r='1.5' />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  disabled={!canUnlink || unlinkMutation.isPending}
                  onSelect={() => unlinkMutation.mutate()}
                >
                  {canUnlink ? "Disconnect" : "Cannot disconnect (no password set)"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => linkMutation.mutate()}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? "Connecting…" : "Connect"}
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
