import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { Switch } from "@travada-books/ui/components/switch";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@travada-books/ui/components/dialog";

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
];

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ProfilePage() {
  const [autoTimezone, setAutoTimezone] = useState(true);

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
              <AvatarFallback className='text-sm'>JD</AvatarFallback>
            </Avatar>
            <Button variant='outline' size='sm'>
              Upload photo
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='full-name'>Full name</Label>
            <Input
              id='full-name'
              placeholder='John Doe'
              defaultValue='John Doe'
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='account-email'>Email</Label>
            <Input
              id='account-email'
              type='email'
              defaultValue='john@example.com'
            />
          </div>
        </div>

        <Button size='sm' className='w-fit'>
          Save changes
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
            value={autoTimezone ? deviceTimezone : "Africa/Nairobi"}
            disabled={autoTimezone}
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
          <Select defaultValue='dd-mm-yyyy'>
            <SelectTrigger id='date-format' className='w-72'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='dd-mm-yyyy'>
                DD/MM/YYYY (31/12/2025)
              </SelectItem>
              <SelectItem value='mm-dd-yyyy'>
                MM/DD/YYYY (12/31/2025)
              </SelectItem>
              <SelectItem value='yyyy-mm-dd'>
                YYYY-MM-DD (2025-12-31)
              </SelectItem>
              <SelectItem value='d-mmm-yyyy'>
                D MMM YYYY (31 Dec 2025)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='time-format'>Time format</Label>
          <Select defaultValue='12h'>
            <SelectTrigger id='time-format' className='w-72'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='12h'>12-hour (2:30 PM)</SelectItem>
              <SelectItem value='24h'>24-hour (14:30)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size='sm' className='w-fit'>
          Save changes
        </Button>
      </section>

      <Separator />

      <section className='flex flex-col gap-5'>
        <div>
          <h2 className='text-sm font-semibold text-destructive'>Delete Account</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Permanently delete your account and all associated data.
          </p>
        </div>

        <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3'>
          <p className='text-xs text-muted-foreground leading-relaxed'>
            Deleting your account is <span className='font-medium text-foreground'>permanent and cannot be undone.</span> All of the following will be immediately and irreversibly removed:
          </p>
          <ul className='text-xs text-muted-foreground space-y-1 pl-3'>
            <li className='flex gap-2'><span className='text-destructive'>·</span> Your profile and login credentials</li>
            <li className='flex gap-2'><span className='text-destructive'>·</span> All invoices, quotes, and customer records</li>
            <li className='flex gap-2'><span className='text-destructive'>·</span> All uploaded files and documents</li>
            <li className='flex gap-2'><span className='text-destructive'>·</span> Your organisation and any team members in it</li>
            <li className='flex gap-2'><span className='text-destructive'>·</span> Any active subscription — no refunds are issued</li>
          </ul>
        </div>

        <Dialog>
          <DialogTrigger render={<Button variant='destructive' size='sm' className='w-fit' />}>
            Delete my account
          </DialogTrigger>
          <DialogContent className="md:max-w-xl">
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, all your data, and cancel any active
                subscription. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <p className='text-xs text-muted-foreground'>
              Type <span className='font-mono font-medium text-foreground'>delete my account</span> to confirm.
            </p>
            <Input placeholder='delete my account' />
            <DialogFooter>
              <DialogClose render={<Button variant='outline' size='sm' />}>
                Cancel
              </DialogClose>
              <Button variant='destructive' size='sm'>Delete account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
