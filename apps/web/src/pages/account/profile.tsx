import { useRef, useState, useEffect } from "react"
import * as Sentry from "@sentry/react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@travada-books/ui/components/button"
import { Input } from "@travada-books/ui/components/input"
import { Label } from "@travada-books/ui/components/label"
import { Separator } from "@travada-books/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select"
import { Switch } from "@travada-books/ui/components/switch"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@travada-books/ui/components/avatar"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { updateUserProfile, updateUserRegional, uploadUserAvatar } from "@/lib/queries/profile"

const timezones = [
  { value: "Africa/Nairobi", label: "Nairobi — EAT (UTC+3)" },
  { value: "Africa/Johannesburg", label: "Johannesburg — SAST (UTC+2)" },
  { value: "Africa/Lagos", label: "Lagos — WAT (UTC+1)" },
  { value: "Africa/Cairo", label: "Cairo — EET (UTC+2)" },
  { value: "Africa/Accra", label: "Accra — GMT (UTC+0)" },
  { value: "Asia/Dubai", label: "Dubai — GST (UTC+4)" },
  { value: "Europe/London", label: "London — GMT/BST (UTC+0/+1)" },
  { value: "Europe/Paris", label: "Paris — CET/CEST (UTC+1/+2)" },
  { value: "America/New_York", label: "New York — EST/EDT (UTC−5/−4)" },
  { value: "America/Los_Angeles", label: "Los Angeles — PST/PDT (UTC−8/−7)" },
  { value: "UTC", label: "UTC (UTC+0)" },
]

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function ProfilePage() {
  const { user, profile, avatarUrl: resolvedAvatarUrl, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [autoTimezone, setAutoTimezone] = useState(true)
  const [timezone, setTimezone] = useState("Africa/Nairobi")
  const [dateFormat, setDateFormat] = useState("dd-mm-yyyy")
  const [timeFormat, setTimeFormat] = useState("24h")
  const [lastLoadedProfileId, setLastLoadedProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    // Always sync non-editable UI state so avatar uploads are reflected immediately.
    setAvatarUrl(profile.avatar_url)
    // Only hydrate editable fields on first load or when the signed-in user changes
    // so an in-progress edit is not overwritten by a background profile refresh.
    if (profile.id === lastLoadedProfileId) return
    setLastLoadedProfileId(profile.id)
    setFullName(profile.full_name ?? "")
    setEmail(profile.email ?? user?.email ?? "")
    setAutoTimezone(profile.timezone_auto_sync)
    setTimezone(profile.timezone)
    setDateFormat(profile.date_format === "DD/MM/YYYY" ? "dd-mm-yyyy"
      : profile.date_format === "MM/DD/YYYY" ? "mm-dd-yyyy"
      : profile.date_format === "YYYY-MM-DD" ? "yyyy-mm-dd"
      : "d-mmm-yyyy")
    setTimeFormat(profile.time_format === "12h" ? "12h" : "24h")
  }, [profile, user])

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadUserAvatar(user!.id, file)
      await updateUserProfile(user!.id, { full_name: profile?.full_name ?? null })
      const { error: updateError } = await supabase.from("users").update({ avatar_url: url }).eq("id", user!.id)
      if (updateError) throw updateError
      return url
    },
    onSuccess: async (url) => {
      setAvatarUrl(url)
      await refreshProfile()
    },
    onError: (err) => {
      Sentry.captureException(err)
      toast.error("Failed to save avatar. Please try again.")
    },
  })

  const profileMutation = useMutation({
    mutationFn: async () => {
      await updateUserProfile(user!.id, { full_name: fullName || null })
      const currentEmail = user?.email
      if (email && email !== currentEmail) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) throw error
        return "email-changed"
      }
    },
    onSuccess: async (result) => {
      await refreshProfile()
      if (result === "email-changed") {
        toast.success("Profile saved. Check your inbox to confirm the new email address.")
      } else {
        toast.success("Profile saved.")
      }
    },
    onError: (err) => {
      Sentry.captureException(err)
      toast.error("Failed to save profile. Please try again.")
    },
  })

  const regionalMutation = useMutation({
    mutationFn: () =>
      updateUserRegional(user!.id, {
        timezone_auto_sync: autoTimezone,
        timezone: autoTimezone ? deviceTimezone : timezone,
        date_format:
          dateFormat === "dd-mm-yyyy" ? "DD/MM/YYYY"
          : dateFormat === "mm-dd-yyyy" ? "MM/DD/YYYY"
          : dateFormat === "yyyy-mm-dd" ? "YYYY-MM-DD"
          : "D MMM YYYY",
        time_format: timeFormat,
      }),
    onSuccess: async () => {
      await refreshProfile()
      toast.success("Regional settings saved.")
    },
    onError: (err) => {
      Sentry.captureException(err)
      toast.error("Failed to save regional settings. Please try again.")
    },
  })

  function getInitials() {
    const name = fullName || user?.email || ""
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("")
  }

  return (
    <div className='flex flex-col gap-8'>
      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold'>Profile</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Your personal information on this account.
          </p>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label>Avatar</Label>
          <div className='flex items-center gap-4'>
            <Avatar className='size-14'>
              <AvatarImage src={resolvedAvatarUrl ?? undefined} />
              <AvatarFallback className='text-sm'>{getInitials()}</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/jpg,image/webp'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) avatarMutation.mutate(file)
                e.target.value = ""
              }}
            />
            <Button
              variant='outline'
              size='sm'
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
            >
              {avatarMutation.isPending ? "Uploading…" : "Upload photo"}
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='full-name'>Full name</Label>
            <Input
              id='full-name'
              placeholder='John Doe'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='account-email'>Email</Label>
            <Input
              id='account-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <Button
          size='sm'
          className='w-fit'
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
        >
          {profileMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <Separator />

      <section className='flex flex-col gap-7'>
        <div>
          <h2 className='text-sm font-semibold'>Regional</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Controls how dates and times are displayed across the app.
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='timezone'>Timezone</Label>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground'>
                Use device timezone
              </span>
              <Switch
                checked={autoTimezone}
                onCheckedChange={setAutoTimezone}
              />
            </div>
          </div>
          <Select
            value={autoTimezone ? deviceTimezone : timezone}
            disabled={autoTimezone}
            onValueChange={setTimezone}
          >
            <SelectTrigger id='timezone' className='w-72'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {autoTimezone ?
                <SelectItem value={deviceTimezone}>{deviceTimezone}</SelectItem>
              : timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='date-format'>Date format</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger id='date-format' className='w-72'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='dd-mm-yyyy'>DD/MM/YYYY (31/12/2025)</SelectItem>
              <SelectItem value='mm-dd-yyyy'>MM/DD/YYYY (12/31/2025)</SelectItem>
              <SelectItem value='yyyy-mm-dd'>YYYY-MM-DD (2025-12-31)</SelectItem>
              <SelectItem value='d-mmm-yyyy'>D MMM YYYY (31 Dec 2025)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='time-format'>Time format</Label>
          <Select value={timeFormat} onValueChange={setTimeFormat}>
            <SelectTrigger id='time-format' className='w-72'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='12h'>12-hour (2:30 PM)</SelectItem>
              <SelectItem value='24h'>24-hour (14:30)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size='sm'
          className='w-fit'
          onClick={() => regionalMutation.mutate()}
          disabled={regionalMutation.isPending}
        >
          {regionalMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </section>
    </div>
  )
}
