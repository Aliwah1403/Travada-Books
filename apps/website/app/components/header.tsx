import { useState, type ReactNode } from "react"
import { Link } from "react-router"

import { Button, buttonVariants } from "@travada-books/ui/components/button"
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@travada-books/ui/components/navigation-menu"
import { Navbar4 } from "@travada-books/ui/components/navbar4"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  Cancel01Icon,
  GridIcon,
  InboxIcon,
  Invoice01Icon,
  Menu01Icon,
  UserIcon,
} from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { FEATURES_NAV, RESOURCES_NAV, SITE_NAME } from "~/data/site"
import { PRICING_PUBLISHED } from "~/data/pricing"

const featureIcons = [Invoice01Icon, BankIcon, InboxIcon]

const solutionLinks = [
  {
    label: "Freelancers",
    description:
      "Invoice clients and keep records without losing billable time.",
  },
  {
    label: "Consultants",
    description:
      "Put retainers, reminders, and recurring work on a reliable rhythm.",
  },
  {
    label: "Small businesses",
    description:
      "Keep invoices, statements, and receipts together as you grow.",
  },
  {
    label: "Agencies",
    description: "Move from quote to payment without duplicating the admin.",
  },
]

function MegaLink({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <NavigationMenuLink
      render={<Link to={to} />}
      className="group grid min-h-[7.5rem] grid-cols-[2.2rem_1fr_auto] items-start gap-3 rounded-none border border-border/70 bg-background p-5 hover:bg-muted/55"
    >
      <span className="grid size-9 place-items-center rounded-md bg-[color-mix(in_oklab,var(--website-green)_10%,white)] text-[var(--website-green)] [&_svg]:size-[1.05rem]">
        {icon ?? <ArrowRight01Icon />}
      </span>
      <span>
        <strong className="block font-heading text-[.86rem] font-semibold tracking-[-.025em] text-foreground">
          {title}
        </strong>
        {description ? (
          <small className="mt-2 block max-w-[17rem] font-heading text-[.7rem] leading-[1.5] text-muted-foreground">
            {description}
          </small>
        ) : null}
      </span>
      <ArrowRight01Icon className="mt-1 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
    </NavigationMenuLink>
  )
}

function ProductsMenu() {
  return (
    <div className="grid min-h-[22rem] grid-cols-[.72fr_1.28fr] gap-8 p-8">
      <Link
        to="/integrations"
        className="group flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-lg bg-[var(--website-green)] p-7 text-white"
      >
        <span className="font-sans text-[.6rem] font-semibold uppercase tracking-[.1em] text-[#dafa4d]">
          The connected books
        </span>
        <div>
          <GridIcon className="mb-6 size-8 text-[#dafa4d]" />
          <strong className="block max-w-[18rem] font-heading text-[1.7rem] font-medium leading-[1.03] tracking-[-.055em]">
            Bring the places your paperwork lives into one calm workflow.
          </strong>
          <span className="mt-6 inline-flex items-center gap-2 font-sans text-[.67rem] font-semibold">
            Explore integrations{" "}
            <ArrowRight01Icon className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
      <div>
        <p className="mb-4 font-sans text-[.56rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">
          Products
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES_NAV.map((item, index) => {
            const Icon = featureIcons[index]
            return (
              <MegaLink
                key={item.href}
                to={item.href}
                title={item.label}
                description={item.description}
                icon={<Icon />}
              />
            )
          })}
          <MegaLink
            to="/integrations"
            title="Integrations"
            description="Connect the services your business already depends on."
            icon={<GridIcon />}
          />
        </div>
      </div>
    </div>
  )
}

function SolutionsMenu() {
  return (
    <div className="grid min-h-[22rem] grid-cols-2 gap-3 p-8">
      {solutionLinks.map((item) => (
        <MegaLink
          key={item.label}
          to="/who-its-for"
          title={item.label}
          description={item.description}
          icon={<UserIcon />}
        />
      ))}
    </div>
  )
}

function ResourcesMenu() {
  return (
    <div className="grid min-h-[22rem] grid-cols-[1fr_.72fr] gap-8 p-8">
      <div>
        <p className="mb-4 font-sans text-[.56rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">
          Learn and follow along
        </p>
        <div className="grid grid-cols-2 gap-3">
          {RESOURCES_NAV.map((item) => (
            <MegaLink
              key={item.href}
              to={item.href}
              title={item.label}
              description={item.description}
            />
          ))}
        </div>
      </div>
      <Link
        to="/guides"
        className="group flex min-h-[17rem] flex-col justify-between rounded-lg bg-[#f1f2ee] p-7 text-[var(--website-ink)]"
      >
        <span className="font-sans text-[.58rem] font-semibold uppercase tracking-[.1em] text-[var(--website-green)]">
          From the field guide
        </span>
        <div>
          <strong className="block font-heading text-[1.55rem] font-medium leading-[1.05] tracking-[-.05em]">
            Practical answers for invoicing and bookkeeping in Kenya.
          </strong>
          <span className="mt-6 inline-flex items-center gap-2 font-sans text-[.67rem] font-semibold text-[var(--website-green)]">
            Read the guides{" "}
            <ArrowRight01Icon className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </div>
  )
}

type MobileSection = "products" | "solutions" | "resources" | null

const mobileSections = {
  products: {
    title: "Products",
    links: [
      ...FEATURES_NAV,
      {
        label: "Integrations",
        href: "/integrations",
        description: "Connect your existing tools",
      },
    ],
  },
  solutions: {
    title: "Solutions",
    links: solutionLinks.map((item) => ({ ...item, href: "/who-its-for" })),
  },
  resources: { title: "Resources", links: RESOURCES_NAV },
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<MobileSection>(null)

  const closeMobile = () => {
    setMobileOpen(false)
    setMobileSection(null)
  }

  return (
    <Navbar4
      className="sticky top-0"
      brand={
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${SITE_NAME} home`}
        >
          <span className="grid size-8 place-items-center rounded-[.48rem] bg-[var(--website-green)]">
            <img
              src="/logo.svg"
              alt=""
              className="size-5 brightness-0 invert"
            />
          </span>
          <span className="font-heading text-sm font-semibold tracking-[-0.03em] text-foreground">
            {SITE_NAME}
          </span>
        </Link>
      }
      navigation={
        <NavigationMenuList className="hidden lg:flex">
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent className="navbar4__content w-[min(72rem,calc(100vw-3rem))] p-0">
              <ProductsMenu />
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
            <NavigationMenuContent className="navbar4__content w-[min(72rem,calc(100vw-3rem))] p-0">
              <SolutionsMenu />
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              render={<Link to="/integrations" />}
              className="px-3 py-2 text-xs font-medium"
            >
              Integrations
            </NavigationMenuLink>
          </NavigationMenuItem>
          {PRICING_PUBLISHED ? (
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link to="/pricing" />}
                className="px-3 py-2 text-xs font-medium"
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          ) : null}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent className="navbar4__content w-[min(72rem,calc(100vw-3rem))] p-0">
              <ResourcesMenu />
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      }
      actions={
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <AppLink
            to="login"
            location="header"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Log in
          </AppLink>
          <AppLink
            to="signup"
            location="header"
            className={buttonVariants({
              size: "sm",
              className: "rounded-[.45rem] px-[.9rem]",
            })}
          >
            Start free <ArrowRight01Icon />
          </AppLink>
        </div>
      }
      mobileTrigger={
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="lg:hidden"
          onClick={() => {
            setMobileOpen((open) => !open)
            if (mobileOpen) setMobileSection(null)
          }}
        >
          {mobileOpen ? (
            <Cancel01Icon className="size-5" />
          ) : (
            <Menu01Icon className="size-5" />
          )}
        </Button>
      }
      mobileMenu={
        mobileOpen ? (
          <div className="fixed inset-x-0 top-[4.75rem] h-[calc(100dvh-4.75rem)] overflow-y-auto border-t border-border bg-background lg:hidden">
            <Container className="max-w-7xl py-4">
              {mobileSection ? (
                <div>
                  <button
                    type="button"
                    className="flex items-center gap-2 py-4 font-sans text-xs font-semibold text-muted-foreground"
                    onClick={() => setMobileSection(null)}
                  >
                    <ArrowLeft01Icon className="size-4" /> Back
                  </button>
                  <h2 className="border-b border-border py-5 font-heading text-2xl font-medium tracking-[-.04em]">
                    {mobileSections[mobileSection].title}
                  </h2>
                  <nav
                    aria-label={`${mobileSections[mobileSection].title} navigation`}
                  >
                    {mobileSections[mobileSection].links.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        to={item.href}
                        onClick={closeMobile}
                        className="group flex items-start justify-between gap-4 border-b border-border py-6"
                      >
                        <span>
                          <strong className="block font-heading text-base font-medium">
                            {item.label}
                          </strong>
                          {item.description ? (
                            <small className="mt-2 block max-w-[24rem] font-heading text-xs leading-relaxed text-muted-foreground">
                              {item.description}
                            </small>
                          ) : null}
                        </span>
                        <ArrowRight01Icon className="mt-1 size-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </nav>
                </div>
              ) : (
                <div>
                  {(["products", "solutions", "resources"] as const).map(
                    (section) => (
                      <button
                        key={section}
                        type="button"
                        className="flex w-full items-center justify-between border-b border-border py-6 font-heading text-lg font-medium"
                        onClick={() => setMobileSection(section)}
                      >
                        {mobileSections[section].title}
                        <ArrowRight01Icon className="size-4" />
                      </button>
                    ),
                  )}
                  <Link
                    to="/integrations"
                    onClick={closeMobile}
                    className="flex items-center justify-between border-b border-border py-6 font-heading text-lg font-medium"
                  >
                    Integrations <ArrowRight01Icon className="size-4" />
                  </Link>
                  {PRICING_PUBLISHED ? (
                    <Link
                      to="/pricing"
                      onClick={closeMobile}
                      className="flex items-center justify-between border-b border-border py-6 font-heading text-lg font-medium"
                    >
                      Pricing <ArrowRight01Icon className="size-4" />
                    </Link>
                  ) : null}
                  <div className="mt-8 grid gap-3">
                    <AppLink
                      to="login"
                      location="mobile-nav"
                      className={buttonVariants({
                        variant: "outline",
                        size: "lg",
                      })}
                    >
                      Log in
                    </AppLink>
                    <AppLink
                      to="signup"
                      location="mobile-nav"
                      className={buttonVariants({ size: "lg" })}
                    >
                      Start free
                    </AppLink>
                  </div>
                </div>
              )}
            </Container>
          </div>
        ) : null
      }
    />
  )
}
