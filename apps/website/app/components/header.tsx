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
import { FEATURES_NAV, HEADER_NAV, RESOURCES_NAV, SITE_NAME } from "~/data/site"
import { PRICING_PUBLISHED } from "~/data/pricing"

const NAV_LINKS = PRICING_PUBLISHED
  ? [{ label: "Pricing", href: "/pricing" }, ...HEADER_NAV]
  : HEADER_NAV

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-[color-mix(in_oklab,var(--background)_87%,transparent)] backdrop-blur-xl">
      <Container className="flex h-[4.5rem] max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          <span className="grid h-[2rem] w-[2rem] place-items-center rounded-[.48rem] border border-border bg-foreground"><img src="/logo.svg" alt="" className="h-5 w-5 brightness-0 invert" /></span>
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
            <DropdownMenuContent align="start" className="w-[19rem] p-[.45rem]">
              {FEATURES_NAV.map((link) => (
                <DropdownMenuItem key={link.href} className="flex-col items-start gap-[.28rem] px-[.8rem] py-[.7rem]" render={<Link to={link.href} />}>
                  <span className="text-foreground [font-weight:550] text-[.78rem] leading-[1.2] font-heading">{link.label}</span>
                  <small className="text-muted-foreground font-normal text-[.64rem] leading-[1.35] font-sans">{link.description}</small>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" render={<Link to={link.href} />}>
              {link.label}
            </Button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" data-icon="inline-end" />}>
              Resources
              <ArrowDown01Icon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[19rem] p-[.45rem]">
              {RESOURCES_NAV.map((link) => (
                <DropdownMenuItem key={link.href} className="flex-col items-start gap-[.28rem] px-[.8rem] py-[.7rem]" render={<Link to={link.href} />}>
                  <span className="text-foreground [font-weight:550] text-[.78rem] leading-[1.2] font-heading">{link.label}</span>
                  <small className="text-muted-foreground font-normal text-[.64rem] leading-[1.35] font-sans">{link.description}</small>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<AppLink to="login" location="header" />}>
            Log in
          </Button>
          <Button className="rounded-[.45rem] bg-foreground px-[.85rem] text-background hover:bg-[color-mix(in_oklab,var(--foreground)_84%,transparent)]" size="sm" render={<AppLink to="signup" location="header" />}>
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
              <span className="px-3 pt-2 pb-1 font-mono text-[10px] text-muted-foreground uppercase">Features</span>
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
              <span className="px-3 pt-4 pb-1 font-mono text-[10px] text-muted-foreground uppercase">Resources</span>
              {RESOURCES_NAV.map((link) => (
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
