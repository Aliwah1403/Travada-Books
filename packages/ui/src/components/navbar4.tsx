import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"
import { NavigationMenu } from "@travada-books/ui/components/navigation-menu"

type Navbar4Props = {
  brand: ReactNode
  navigation: ReactNode
  actions: ReactNode
  mobileTrigger: ReactNode
  mobileMenu?: ReactNode
  className?: string
  containerClassName?: string
}

/**
 * Adapted from Shadcn Blocks' Navbar 4.
 *
 * The shell keeps the block's wide desktop mega-menu structure and layered
 * mobile navigation while leaving routing, labels, and promotional content to
 * the consuming application.
 */
export function Navbar4({
  brand,
  navigation,
  actions,
  mobileTrigger,
  mobileMenu,
  className,
  containerClassName,
}: Navbar4Props) {
  return (
    <header
      className={cn(
        "relative z-50 border-b border-border/70 bg-background/95 backdrop-blur-xl",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 sm:px-6",
          containerClassName,
        )}
      >
        <NavigationMenu
          className="min-w-full justify-start"
          positionerClassName="navbar4__positioner"
          popupClassName="navbar4__popup"
        >
          <div className="flex h-[4.75rem] w-full items-center justify-between gap-6">
            {brand}
            {navigation}
            {actions}
            {mobileTrigger}
          </div>
        </NavigationMenu>
      </div>
      {mobileMenu}
    </header>
  )
}
