import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function SecurityPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      if (!newPassword) throw new Error("Please enter a new password.")
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.")
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.")

      // Re-authenticate to verify current password
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
    onError: (err) => toast.error(String(err instanceof Error ? err.message : err)),
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
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Updating…" : "Update password"}
        </Button>
      </section>
    </div>
  )
}
