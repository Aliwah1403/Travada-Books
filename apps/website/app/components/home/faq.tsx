import { Link } from "react-router"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@travada-books/ui/components/accordion"

import { Section } from "~/components/section"
import { FAQ_ITEMS, type FaqItem } from "~/data/faq"
import { PRICING_PUBLISHED } from "~/data/pricing"
import { CONTACT_EMAIL } from "~/data/site"

type FaqProps = {
  items?: FaqItem[]
  heading?: string
}

// Reused on feature pages (batch 3) with their own `items` — the "cost" and
// "contact" ids only ever appear in the home FAQ_ITEMS set, so the special
// cases below are inert (never matched) for every other page's items.
export function Faq({ items = FAQ_ITEMS, heading = "Frequently asked questions" }: FaqProps) {
  return (
    <Section containerClassName="mx-auto max-w-[42rem]">
      <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        {heading}
      </h2>

      <Accordion className="mt-10">
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              {item.id === "cost" && PRICING_PUBLISHED ? (
                <p>
                  See our <Link to="/pricing">pricing page</Link>.
                </p>
              ) : item.id === "contact" ? (
                <p>
                  Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </p>
              ) : (
                <p>{item.answer}</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}
