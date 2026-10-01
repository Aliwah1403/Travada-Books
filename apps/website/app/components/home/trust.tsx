import {
  Delete01Icon,
  Download01Icon,
  LockPasswordIcon,
  type Icon,
} from "@travada-books/ui/icons"

import { SafeBooks } from "~/components/illustrations/safe-books"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"

/* -------------------------------------------------------------------------- */
/* 9 · Your books, kept safe                                                   */
/* -------------------------------------------------------------------------- */

// Only claims that are true today. No certifications, encryption or uptime
// claims (WEBSITE-REDO-PLAN.md §4 home #9).
const SAFETY: { title: string; body: string; icon: Icon }[] = [
  {
    title: "Only your team sees them",
    body: "Each business’s books are visible only to the members of that business.",
    icon: LockPasswordIcon,
  },
  {
    title: "Export everything, any time",
    body: "Download all of your organisation’s data whenever you want it. It’s yours.",
    icon: Download01Icon,
  },
  {
    title: "Leave cleanly",
    body: "Delete your organisation and its data, with a full export offered first.",
    icon: Delete01Icon,
  },
]

export function KeptSafe() {
  return (
    <Section tone="dark" size="lg">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow className="text-panel/60">Trust</Eyebrow>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-balance md:text-4xl">
            Your books, kept safe.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-pretty text-panel/70">
            Your records belong to your business, and you decide what happens to them.
          </p>
          <ul className="mt-10 flex flex-col gap-px overflow-hidden rounded-lg border border-panel/15 bg-panel/15">
            {SAFETY.map(({ title, body, icon: SafetyIcon }) => (
              <li key={title} className="flex gap-4 bg-dark p-5">
                <SafetyIcon className="mt-0.5 size-5 shrink-0 text-brand-soft" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-medium text-panel">{title}</h3>
                  <p className="mt-1 text-sm text-pretty text-panel/70">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SafeBooks className="mx-auto h-auto w-full max-w-lg" />
      </div>
    </Section>
  )
}
