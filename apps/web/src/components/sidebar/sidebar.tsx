import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Invoice01Icon,
  FileEditIcon,
  User02Icon,
  Wallet01Icon,
  Timer01Icon,
  SafeIcon,
  SortingIcon,
  Logout02Icon,
  Settings02Icon,
  GridIcon,
  MoreVerticalIcon,
  TickIcon,
  PlusSignIcon,
} from "@travada-books/ui/icons";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@travada-books/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@travada-books/ui/components/tooltip";
import { NavItem } from "./nav-item";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";

const salesNav = [
  { icon: Invoice01Icon, label: "Invoices", to: "/invoices" },
  { icon: FileEditIcon, label: "Quotes", to: "/quotes" },
];

const mainNav = [
  { icon: User02Icon, label: "Customers", to: "/customers" },
  {
    icon: Wallet01Icon,
    label: "Transactions",
    to: "/transactions",
    comingSoon: true,
  },
  { icon: Timer01Icon, label: "Tracker", to: "/tracker", comingSoon: true },
  { icon: SafeIcon, label: "Vault", to: "/vault", comingSoon: true },
];

function OrgSwitcher() {
  const { org, orgRole, orgs, switchOrg } = useAuth();
  const isOwner = orgRole === "owner";
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const orgName = org?.name ?? "My Organization";
  const orgLogoUrl = org?.logo_url ?? null;
  const orgInitials = orgName.slice(0, 2).toUpperCase();

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

  async function handleSwitchOrg(orgId: string) {
    if (orgId === org?.id || switching) return;
    setSwitching(orgId);
    await switchOrg(orgId);
    setSwitching(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className='flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' />
        }
      >
        <Avatar className='size-6 rounded-md'>
          {orgLogoUrl && <AvatarImage src={orgLogoUrl} alt={orgName} />}
          <AvatarFallback className='rounded-md text-[10px] font-semibold'>
            {orgInitials}
          </AvatarFallback>
        </Avatar>
        <span className='flex-1 truncate text-left text-xs font-medium'>
          {orgName}
        </span>
        <MoreVerticalIcon size={14} className='shrink-0 text-muted-foreground' />
      </DropdownMenuTrigger>

      <DropdownMenuContent side='right' align='end' sideOffset={8} className='w-56'>
        {/* Org info card — clicking opens the org switcher submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className='gap-2.5 px-2 py-2'>
            <Avatar className='size-8 shrink-0 rounded-md'>
              {orgLogoUrl && <AvatarImage src={orgLogoUrl} alt={orgName} />}
              <AvatarFallback className='rounded-md text-xs font-semibold'>
                {orgInitials}
              </AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col'>
              <span className='truncate text-xs font-medium'>{orgName}</span>
              <span className='truncate text-[10px] capitalize text-muted-foreground'>
                {orgRole}
              </span>
            </div>
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent className='w-52'>
            {orgs.map(({ org: o }) => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => handleSwitchOrg(o.id)}
                disabled={switching !== null}
                className='gap-2.5'
              >
                <Avatar className='size-5 shrink-0 rounded-md'>
                  {o.logo_url && <AvatarImage src={o.logo_url} alt={o.name} />}
                  <AvatarFallback className='rounded-md text-[9px] font-semibold'>
                    {o.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className='flex-1 truncate text-xs'>{o.name}</span>
                {o.id === org?.id && (
                  <TickIcon size={12} className='shrink-0 text-muted-foreground' />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => navigate("/onboarding/org?mode=create")}
              className='gap-2.5'
            >
              <PlusSignIcon size={14} className='shrink-0 text-muted-foreground' />
              <span className='text-xs'>Create organization</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link to='/settings/general' />}>
          <Settings02Icon size={14} className='shrink-0' />
          General
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to='/settings/team' />}>
          <User02Icon size={14} className='shrink-0' />
          Team
        </DropdownMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='relative flex cursor-not-allowed select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-40 outline-none'>
              <GridIcon size={14} className='shrink-0' />
              Integrations
            </div>
          </TooltipTrigger>
          <TooltipContent side='right'>Coming soon</TooltipContent>
        </Tooltip>
        {isOwner && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='relative flex cursor-not-allowed select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-40 outline-none'>
                <Wallet01Icon size={14} className='shrink-0' />
                Billing
              </div>
            </TooltipTrigger>
            <TooltipContent side='right'>Coming soon</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className='text-destructive focus:text-destructive'
        >
          <Logout02Icon size={14} className='shrink-0' />
          {signingOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;

  return (
    <aside className='flex h-screen w-56 shrink-0 flex-col border-r bg-background'>
      {/* Logo */}
      <div className='flex h-14 items-center gap-2 px-4'>
        <img src={logo} alt='Travada Books' className='size-6' />
        <span className='text-sm font-semibold'>Travada Books</span>
      </div>

      <Separator />

      {/* Main nav */}
      <nav className='flex flex-1 flex-col overflow-y-auto px-2 py-3'>
        {/* Sales group — Invoices + Quotes */}
        <div className='flex flex-col gap-0.5'>
          {salesNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              comingSoon={item.comingSoon}
            />
          ))}
        </div>

        <div className='my-2 border-t' />

        {/* Everything else */}
        <div className='flex flex-col gap-0.5'>
          {mainNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              comingSoon={item.comingSoon}
            />
          ))}
        </div>
      </nav>

      <Separator />

      {/* Org switcher */}
      <div className='px-2 py-3'>
        <OrgSwitcher />
      </div>
    </aside>
  );
}
