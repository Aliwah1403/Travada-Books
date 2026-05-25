import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Notification01Icon,
  Moon01Icon,
  Sun01Icon,
  UserIcon,
  LockPasswordIcon,
  Logout02Icon,
} from "@travada-books/ui/icons";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const toggleTheme = () => {
    setTheme(
      theme === "dark" ? "light"
      : theme === "light" ? "dark"
      : "dark",
    );
  };

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast.error("Failed to sign out. Please try again.");
      return;
    }
    navigate("/login");
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? ""
  const email = user?.email ?? ""
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  return (
    <header className='flex h-14 shrink-0 items-center justify-between border-b px-6'>
      <h1 className='text-sm font-medium'>{title}</h1>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='icon-lg' onClick={toggleTheme}>
          {theme === "dark" ?
            <Sun01Icon size={32} />
          : <Moon01Icon size={32} />}
        </Button>
        <Button variant='ghost' size='icon-lg'>
          <Notification01Icon size={16} />
        </Button>
        <Separator orientation='vertical' className='h-7' />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Avatar className='size-7 cursor-pointer ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' />
            }
          >
            <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuGroup>
              <DropdownMenuLabel className='flex flex-col gap-0.5'>
                <span className='text-xs font-medium'>{fullName || email}</span>
                {fullName && (
                  <span className='text-[10px] font-normal text-muted-foreground'>
                    {email}
                  </span>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to='/account/profile' />}>
                <UserIcon size={14} className='shrink-0' />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to='/account/security' />}>
                <LockPasswordIcon size={14} className='shrink-0' />
                Security
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to='/account/notifications' />}>
                <Notification01Icon size={14} className='shrink-0' />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className='text-destructive focus:text-destructive'
            >
              <Logout02Icon size={14} className='shrink-0' />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
