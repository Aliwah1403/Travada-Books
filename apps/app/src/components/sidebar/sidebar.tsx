import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  DashboardSquare01Icon,
  SparklesIcon,
  Invoice01Icon,
  FileEditIcon,
  User02Icon,
  Wallet01Icon,
  Logout02Icon,
  Settings02Icon,
  GridIcon,
  MoreVerticalIcon,
  TickIcon,
  PlusSignIcon,
  VaultIcon,
  InboxIcon,
  ReceiptTextIcon,
  PanelLeftIcon,
  Menu01Icon,
  type Icon,
} from "@travada-books/ui/icons";
import { Separator } from "@travada-books/ui/components/separator";
import { Button } from "@travada-books/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@travada-books/ui/components/sheet";
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
import { cn } from "@travada-books/ui/lib/utils";
import { GlobalSearch } from "@/components/search/global-search";
import { NavItem } from "./nav-item";
import { OnboardingChecklistTrigger } from "./onboarding-checklist-trigger";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";

const dashboardNav = [
  { icon: DashboardSquare01Icon, label: "Dashboard", to: "/", end: true },
  { icon: SparklesIcon, label: "Insights", to: "/insights" },
];

const salesNav = [
  { icon: Invoice01Icon, label: "Invoices", to: "/invoices" },
  { icon: FileEditIcon, label: "Quotes", to: "/quotes" },
];

// `comingSoon` is optional — nothing in this group uses it right now (Tracker,
// the only entry that did, was pulled from the nav), but NavItem still reads it.
const mainNav: {
  icon: Icon;
  label: string;
  to: string;
  comingSoon?: boolean;
}[] = [
  { icon: User02Icon, label: "Customers", to: "/customers" },
  {
    icon: Wallet01Icon,
    label: "Transactions",
    to: "/transactions",
  },
  { icon: VaultIcon, label: "Vault", to: "/vault" },
  { icon: InboxIcon, label: "Inbox", to: "/inbox" },
  { icon: ReceiptTextIcon, label: "Bills", to: "/bills" },
];

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
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
    try {
      await switchOrg(orgId);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={collapsed ? orgName : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm fine-hover:bg-accent fine-hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "justify-center",
            )}
          />
        }
      >
        <Avatar className='size-6 rounded-md'>
          {orgLogoUrl && <AvatarImage src={orgLogoUrl} alt={orgName} />}
          <AvatarFallback className='rounded-md text-[10px] font-semibold'>
            {orgInitials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className='flex-1 truncate text-left text-xs font-medium'>
              {orgName}
            </span>
            <MoreVerticalIcon
              size={14}
              className='shrink-0 text-muted-foreground'
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side='right'
        align='end'
        sideOffset={8}
        className='w-56'
      >
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
                  <TickIcon
                    size={12}
                    className='shrink-0 text-muted-foreground'
                  />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => navigate("/onboarding/org?mode=create")}
              className='gap-2.5'
            >
              <PlusSignIcon
                size={14}
                className='shrink-0 text-muted-foreground'
              />
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
        <DropdownMenuItem render={<Link to='/settings/integrations' />}>
          <GridIcon size={14} className='shrink-0' />
          Integrations
        </DropdownMenuItem>
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <div className='relative flex cursor-not-allowed select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-40 outline-none'>
              <GridIcon size={14} className='shrink-0' />
              Integrations
            </div>
          </TooltipTrigger>
          <TooltipContent side='right'>Coming soon</TooltipContent>
        </Tooltip> */}
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

/**
 * Everything inside the sidebar: logo row, search, nav groups, checklist and
 * org switcher. Shared by the desktop <aside> and the mobile nav sheet. On
 * mobile `toggle` is omitted, so the logo row drops its collapse button.
 */
function SidebarBody({
  collapsed,
  toggle,
}: {
  collapsed: boolean;
  toggle?: () => void;
}) {
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;

  return (
    <>
      {/* Logo + open/close trigger */}
      {collapsed && toggle ? (
        <div className='flex h-14 items-center justify-center'>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label='Expand sidebar'
                  onClick={toggle}
                  className='group flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[colors,transform] fine-hover:bg-muted fine-hover:text-foreground active:scale-[0.97]'
                />
              }
            >
              {/* The logo holds the spot; pointing at it reveals what it does. */}
              <img
                src={logo}
                alt=''
                className='size-6 group-focus-visible:hidden [@media(hover:hover)]:group-hover:hidden'
              />
              <PanelLeftIcon
                size={16}
                className='hidden group-focus-visible:block [@media(hover:hover)]:group-hover:block'
              />
            </TooltipTrigger>
            <TooltipContent side='right'>Expand sidebar ⌘B</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className='flex h-14 items-center gap-2 pl-4 pr-3'>
          <img src={logo} alt='Travada Books' className='size-6' />
          <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
            Travada Books
          </span>
          {toggle && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label='Collapse sidebar'
                  onClick={toggle}
                  className='flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[colors,transform] fine-hover:bg-muted fine-hover:text-foreground active:scale-[0.97]'
                />
              }
            >
              <PanelLeftIcon size={16} />
            </TooltipTrigger>
            <TooltipContent side='right'>Collapse sidebar ⌘B</TooltipContent>
          </Tooltip>
          )}
        </div>
      )}

      <Separator />

      <div className='px-2 pt-3'>
        <GlobalSearch collapsed={collapsed} />
      </div>

      {/* Main nav */}
      <nav className='flex flex-1 flex-col overflow-y-auto px-2 pb-3 pt-2'>
        {/* Dashboard */}
        <div className='flex flex-col gap-0.5'>
          {dashboardNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              end={item.end}
              collapsed={collapsed}
            />
          ))}
        </div>

        <div className='my-2 border-t' />

        {/* Sales group — Invoices + Quotes */}
        <div className='flex flex-col gap-0.5'>
          {salesNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              comingSoon={item.comingSoon}
              collapsed={collapsed}
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
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      <div className='px-2 pb-2'>
        <OnboardingChecklistTrigger collapsed={collapsed} />
      </div>

      <Separator />

      {/* Org switcher */}
      <div className='px-2 py-3'>
        <OrgSwitcher collapsed={collapsed} />
      </div>
    </>
  );
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r bg-background md:flex",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <SidebarBody collapsed={collapsed} toggle={toggle} />
    </aside>
  );
}

/**
 * Below `md` the sidebar is hidden; this hamburger opens the same nav in a
 * left sheet. It closes itself on every route change, so tapping a nav item,
 * a search result or an org-menu link all dismiss it without wiring each one.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen} mobileDrawer={false}>
      <Button
        variant='ghost'
        size='icon-lg'
        aria-label='Open navigation'
        onClick={() => setOpen(true)}
        className='-ml-2 md:hidden'
      >
        <Menu01Icon size={20} />
      </Button>
      <SheetContent
        side='left'
        variant='default'
        showCloseButton={false}
        className='w-72 gap-0 bg-background p-0'
      >
        <SheetTitle className='sr-only'>Navigation</SheetTitle>
        <SidebarBody collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}
