import { useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router"

import { Button, buttonVariants } from "@travada-books/ui/components/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@travada-books/ui/components/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@travada-books/ui/components/sheet"
import {
  ArrowRight01Icon,
  BankIcon,
  FileEditIcon,
  InboxIcon,
  Invoice01Icon,
  Menu01Icon,
  MoneyExchange01Icon,
  TaxesIcon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { AppLink } from "~/components/app-link"
import { FRAME_GUTTER, FRAME_WIDTH } from "~/components/site/layout"
import { COMING_SOON_NAV, FEATURES_NAV, RESOURCES_NAV, SITE_NAME, type NavLink } from "~/data/site"

const FEATURE_ICONS: Record<string, Icon> = {
  "/invoicing": Invoice01Icon,
  "/statement-import": BankIcon,
  "/inbox": InboxIcon,
  "/quotes": FileEditIcon,
  "/payments": Wallet01Icon,
}

const COMING_SOON_ICONS: Icon[] = [TaxesIcon, MoneyExchange01Icon]

const TOP_LINKS: NavLink[] = [
  { label: "Who it's for", href: "/who-its-for" },
  { label: "Integrations", href: "/integrations" },
]

// Shared look for triggers and plain top-level links. `transition-colors`
// overrides the shared component's catch-all transition.
const TOP_ITEM =
  "h-9 rounded-md bg-transparent px-3 py-0 text-sm font-medium text-ink-muted transition-colors data-popup-open:text-ink data-[active=true]:bg-transparent data-[active=true]:text-ink"

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2" aria-label={`${SITE_NAME} home`}>
      <img src="/logo.svg" alt="" width={24} height={24} className="size-6" />
      <span className="text-base font-semibold tracking-tight text-ink">{SITE_NAME}</span>
    </Link>
  )
}

function IconTile({ icon: IconComponent, muted = false }: { icon: Icon; muted?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md border border-line",
        muted ? "bg-canvas text-ink-subtle" : "bg-panel text-ink",
      )}
    >
      <IconComponent className="size-4" aria-hidden="true" />
    </span>
  )
}

function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-2 font-mono text-xs tracking-wide text-ink-subtle uppercase">{children}</p>
}

function ProductMenu() {
  return (
    <div className="grid grid-cols-[1fr_15rem]">
      <div className="p-3 pt-4">
        <MenuLabel>Product</MenuLabel>
        <ul className="grid grid-cols-2 gap-1">
          {FEATURES_NAV.map((item) => (
            <li key={item.href}>
              <NavigationMenuLink
                render={<Link to={item.href} />}
                className="items-start gap-3 rounded-lg p-3 transition-colors"
              >
                <IconTile icon={FEATURE_ICONS[item.href] ?? ArrowRight01Icon} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <span className="text-xs/relaxed text-ink-muted">{item.description}</span>
                </span>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-l border-line bg-canvas p-3 pt-4">
        <MenuLabel>Coming soon</MenuLabel>
        <ul className="flex flex-col gap-1">
          {COMING_SOON_NAV.map((item, index) => (
            <li key={item.label} className="flex items-start gap-3 p-3">
              <IconTile icon={COMING_SOON_ICONS[index] ?? ArrowRight01Icon} muted />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink-muted">{item.label}</span>
                <span className="text-xs/relaxed text-ink-subtle">{item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ResourcesMenu() {
  return (
    <div className="p-3 pt-4">
      <MenuLabel>Resources</MenuLabel>
      <ul className="flex flex-col gap-1">
        {RESOURCES_NAV.map((item) => (
          <li key={item.href}>
            <NavigationMenuLink
              render={<Link to={item.href} />}
              className="flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 transition-colors"
            >
              <span className="text-sm font-medium text-ink">{item.label}</span>
              <span className="text-xs/relaxed text-ink-muted">{item.description}</span>
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function DesktopNav() {
  const { pathname } = useLocation()

  return (
    <NavigationMenu
      className="hidden flex-none lg:flex"
      // Dropdown timings from CLAUDE.md: quick enter, faster exit, and the
      // positioner glides between triggers rather than the 350ms default.
      positionerClassName="duration-150 ease-(--ease-out)"
      popupClassName="rounded-xl bg-panel shadow-lg ring-line duration-125 data-ending-style:duration-100"
    >
      <NavigationMenuList className="gap-0.5">
        <NavigationMenuItem>
          <NavigationMenuTrigger className={TOP_ITEM}>Product</NavigationMenuTrigger>
          <NavigationMenuContent className="w-[min(48rem,calc(100vw-3rem))] p-0 duration-100">
            <ProductMenu />
          </NavigationMenuContent>
        </NavigationMenuItem>
        {TOP_LINKS.map((item) => (
          <NavigationMenuItem key={item.href}>
            <NavigationMenuLink
              render={<Link to={item.href} />}
              active={isActive(pathname, item.href)}
              className={TOP_ITEM}
            >
              {item.label}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
        <NavigationMenuItem>
          <NavigationMenuTrigger className={TOP_ITEM}>Resources</NavigationMenuTrigger>
          <NavigationMenuContent className="w-80 p-0 duration-100">
            <ResourcesMenu />
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function MobileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 pb-1 font-mono text-xs tracking-wide text-ink-subtle uppercase">{title}</p>
      {children}
    </div>
  )
}

function MobileLink({ item, onNavigate }: { item: NavLink; onNavigate: () => void }) {
  const IconComponent = FEATURE_ICONS[item.href]
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-md px-2 py-2 text-base font-medium text-ink transition-colors active:opacity-80 fine-hover:bg-canvas"
    >
      {IconComponent ? <IconComponent className="size-4 text-ink-muted" aria-hidden="true" /> : null}
      {item.label}
    </Link>
  )
}

function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" size="icon-lg" className="ml-auto lg:hidden" aria-label="Open menu" />
        }
      >
        <Menu01Icon aria-hidden="true" className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 overflow-y-auto bg-panel data-[side=right]:sm:max-w-sm">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="text-sm">
            <Logo onClick={close} />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="flex flex-col gap-7 px-3 py-6">
          <MobileGroup title="Product">
            {FEATURES_NAV.map((item) => (
              <MobileLink key={item.href} item={item} onNavigate={close} />
            ))}
          </MobileGroup>
          <MobileGroup title="Coming soon">
            {COMING_SOON_NAV.map((item) => (
              <span key={item.label} className="px-2 py-2 text-base text-ink-subtle">
                {item.label}
              </span>
            ))}
          </MobileGroup>
          <MobileGroup title="Explore">
            {TOP_LINKS.map((item) => (
              <MobileLink key={item.href} item={item} onNavigate={close} />
            ))}
          </MobileGroup>
          <MobileGroup title="Resources">
            {RESOURCES_NAV.map((item) => (
              <MobileLink key={item.href} item={item} onNavigate={close} />
            ))}
          </MobileGroup>
        </nav>
        <SheetFooter className="border-t border-line px-5 py-5">
          <AppLink to="login" location="mobile-nav" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-sm")}>
            Log in
          </AppLink>
          <AppLink to="signup" location="mobile-nav" className={cn(buttonVariants({ size: "lg" }), "text-sm")}>
            Start free
          </AppLink>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel/80 backdrop-blur-md">
      <div className={cn(FRAME_WIDTH, FRAME_GUTTER, "flex h-16 items-center gap-6")}>
        <Logo />
        <DesktopNav />
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <AppLink to="login" location="header" className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}>
            Log in
          </AppLink>
          <AppLink to="signup" location="header" className={cn(buttonVariants(), "text-sm")}>
            Start free
          </AppLink>
        </div>
        <MobileNav />
      </div>
    </header>
  )
}
