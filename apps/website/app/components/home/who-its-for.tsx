import { Link } from "react-router"

import { Section } from "~/components/section"
import { PERSONAS } from "~/data/personas"

export function WhoItsFor() {
  return (
    <Section muted>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          If any of this is you, it's for you.
        </h2>
        <Link
          to="/who-its-for"
          className="fine-hover:text-foreground text-sm text-primary underline underline-offset-4"
        >
          Who it's for →
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona) => (
          <div
            key={persona.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-background p-6"
          >
            <h3 className="font-heading text-base font-medium text-foreground">
              {persona.title}
            </h3>
            <p className="font-heading text-sm/relaxed text-muted-foreground">{persona.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
