import { Link } from "react-router"

import { ArrowRight01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"

import { Container } from "~/components/container"
import { INTEGRATIONS } from "~/data/integrations"

type IntegrationsSectionProps = {
  compact?: boolean
  showEyebrow?: boolean
}

export function IntegrationsSection({
  compact = false,
  showEyebrow = true,
}: IntegrationsSectionProps) {
  return (
    <section
      data-dark-surface
      className={cn(
        "border-t border-[var(--website-line)] bg-[var(--website-paper)] px-0 py-[7rem] text-[var(--website-ink)] max-[640px]:py-[5rem]",
        compact && "py-[6rem]",
      )}
    >
      <Container className="max-w-7xl">
        <div className="flex items-end justify-between gap-[3rem] max-[640px]:block">
          <div>
            {showEyebrow ? (
              <p className="flex items-center gap-[.65rem] text-[.64rem] font-semibold uppercase leading-none tracking-[.11em] text-[var(--website-green)] font-sans">
                <span className="h-px w-[1.8rem] bg-current" />
                Integrations
              </p>
            ) : null}
            <h2
              className={cn(
                showEyebrow && "mt-[1.3rem]",
                "text-[clamp(2.4rem,4.5vw,4.5rem)] leading-[.98] tracking-[-.064em] [font-weight:520]",
              )}
            >
              Works with the places
              <br />
              your paperwork already lives.
            </h2>
          </div>
          <Link
            to="/integrations"
            className="inline-flex items-center gap-[.5rem] whitespace-nowrap text-[var(--website-green)] font-sans text-[.67rem] font-semibold leading-none max-[640px]:mt-[1.5rem]"
          >
            View all integrations <ArrowRight01Icon className="w-[.85rem]" />
          </Link>
        </div>
        <div className="mt-[4rem] grid grid-cols-5 border border-[var(--website-line)] max-[900px]:grid-cols-3 max-[640px]:mt-[3rem] max-[640px]:grid-cols-1">
          {INTEGRATIONS.map(({ id, name, status, Icon }) => {
            const isComing = status === "coming-soon"
            return (
              <article
                key={id}
                className={cn(
                  "flex items-center gap-[.85rem] min-h-[7rem] border-r border-[var(--website-line)] p-[1.2rem] last:border-r-0",
                  "max-[900px]:[&:nth-child(3)]:border-r-0 max-[900px]:[&:nth-child(n+4)]:border-t max-[900px]:border-[var(--website-line)]",
                  "max-[640px]:min-h-[5.5rem] max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:last:border-b-0",
                  isComing && "opacity-[.54]",
                )}
              >
                <Icon className="h-[1.55rem] w-[1.55rem] flex-none" />
                <div>
                  <strong className="block font-heading text-[.78rem] leading-[1.2] [font-weight:560]">
                    {name}
                  </strong>
                  <span
                    className={cn(
                      "mt-[.28rem] block font-sans text-[.5rem] leading-none font-medium uppercase tracking-[.06em] text-[var(--website-green)]",
                      isComing &&
                        "text-[color-mix(in_oklab,var(--website-ink)_48%,transparent)]",
                    )}
                  >
                    {status === "available" ? "Available" : "Coming soon"}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
