import { useState } from "react"
import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@travada-books/ui/components/sheet"
import { ArrowDown01Icon, Menu01Icon } from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { FEATURES_NAV, HEADER_NAV, SITE_NAME } from "~/data/site"
import { PRICING_PUBLISHED } from "~/data/pricing"

const NAV_LINKS = PRICING_PUBLISHED
  ? [{ label: "Pricing", href: "/pricing" }, ...HEADER_NAV]
  : HEADER_NAV

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="site-header sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <Container className="flex h-[4.5rem] max-w-7xl items-center justify-between">
        <Link to="/" className="site-logo flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          <span className="site-logo__mark"><img src="/logo.svg" alt="" className="h-5 w-5" /></span>
          <span className="font-heading text-sm font-semibold tracking-[-0.025em] text-foreground">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" data-icon="inline-end" />
              }
            >
              Features
              <ArrowDown01Icon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {FEATURES_NAV.map((link) => (
                <DropdownMenuItem key={link.href} render={<Link to={link.href} />}>
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" render={<Link to={link.href} />}>
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<AppLink to="login" location="header" />}>
            Log in
          </Button>
          <Button className="site-header__cta" size="sm" render={<AppLink to="signup" location="header" />}>
            Start free <span aria-hidden="true">↗</span>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            <Menu01Icon className="size-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{SITE_NAME}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-6">
              {FEATURES_NAV.map((link) => (
                <SheetClose key={link.href} render={<Link to={link.href} />} className="fine-hover:bg-muted fine-hover:text-foreground rounded-md px-3 py-2 text-sm text-muted-foreground active:opacity-80">
                  {link.label}
                </SheetClose>
              ))}
              {NAV_LINKS.map((link) => (
                <SheetClose key={link.href} render={<Link to={link.href} />} className="fine-hover:bg-muted fine-hover:text-foreground rounded-md px-3 py-2 text-sm text-muted-foreground active:opacity-80">
                  {link.label}
                </SheetClose>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" render={<AppLink to="login" location="mobile-nav" />}>
                  Log in
                </Button>
                <Button render={<AppLink to="signup" location="mobile-nav" />}>Start free</Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  )
}
