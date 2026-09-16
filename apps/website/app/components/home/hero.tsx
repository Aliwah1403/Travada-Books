import { Button } from "@travada-books/ui/components/button"

import { AppLink } from "~/components/app-link"
import { Container } from "~/components/container"
import { ScreenshotFrame } from "~/components/screenshot-frame"

export function Hero() {
  return (
    <section className="pt-16 pb-24 md:pt-24 md:pb-32">
      <Container className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Set it once. It runs every month.
          </h1>
          <p className="mt-6 max-w-[50ch] font-heading text-base/relaxed text-muted-foreground">
            Travada Books sends your invoices on schedule, chases the ones that are late, and
            sorts a year of bank records in a minute. The books do themselves.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" render={<AppLink to="signup" location="hero" />}>
              Start free
            </Button>
            <Button size="lg" variant="outline" render={<AppLink to="login" location="hero" />}>
              Log in
            </Button>
          </div>
        </div>

        <ScreenshotFrame label="Recurring invoice — next three send dates" />
      </Container>
    </section>
  )
}
