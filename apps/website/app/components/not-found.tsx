import { Link } from "react-router"

import { buttonVariants } from "@travada-books/ui/components/button"
import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { MissingPage } from "~/components/illustrations/missing-page"
import { Section } from "~/components/site/section"
import { ARROW_NUDGE } from "~/components/home/shared"

// Rendered by the catch-all route and by the $slug routes for an unknown
// slug. Their meta() sets noindex.
export function NotFoundBody() {
  return (
    <Section size="lg">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <MissingPage className="max-w-xs" />
        <h1 className="mt-10 text-4xl font-medium tracking-tight text-balance md:text-5xl">Page not found</h1>
        <p className="mt-4 text-lg text-pretty text-ink-muted">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className={cn(buttonVariants({ size: "lg" }), "text-sm", ARROW_NUDGE)}>
            Back to home <ArrowRight01Icon aria-hidden="true" />
          </Link>
          <Link
            to="/guides"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-line-strong bg-panel text-sm")}
          >
            Read the guides
          </Link>
        </div>
      </div>
    </Section>
  )
}
