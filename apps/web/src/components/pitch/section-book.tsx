import { Link } from "react-router"

import { Button } from "@travada-books/ui/components/button"
import { Mail01Icon } from "@travada-books/ui/icons"

import { Grid, Slide } from "./ui"

export function SectionBook() {
  return (
    <Slide>
      <Grid />

      <h2 className="max-w-3xl font-heading text-5xl font-medium tracking-tight text-foreground md:text-7xl">
        Start free. Today.
      </h2>
      <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
        books.travadasys.com
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link to="/signup">
          <Button size="lg">Get started</Button>
        </Link>
        {/* TODO: swap for a Cal.com embed or WhatsApp link once one exists (see MARKETING-PLAN.md) */}
        <a href="mailto:travadasystems@gmail.com">
          <Button size="lg" variant="outline" className="gap-1.5">
            <Mail01Icon size={14} />
            Talk to us
          </Button>
        </a>
      </div>
    </Slide>
  )
}
