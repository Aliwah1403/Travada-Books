import { Invoice01Icon } from "@travada-books/ui/icons"

import { AppLink } from "~/components/app-link"
import { InvoiceGenerator as Generator } from "~/components/invoice-generator/generator"
import { Eyebrow } from "~/components/site/eyebrow"
import { Section } from "~/components/site/section"
import { captureEvent } from "~/lib/analytics"
import { ogImage } from "~/lib/og"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Free Invoice Generator — Travada Books",
    description:
      "Create an invoice and download it as a PDF. Free, with no signup, and your details stay in your browser.",
    path: "/invoice-generator",
    image: ogImage("invoice-generator"),
  })
}

export default function InvoiceGeneratorPage() {
  return (
    <Section flush>
      <div className="flex flex-col gap-4 border-b border-line px-4 py-10 sm:px-6 md:py-14 lg:px-10">
        <Eyebrow icon={Invoice01Icon}>Free tool</Eyebrow>
        <h1 className="text-4xl font-medium tracking-tight text-balance md:text-5xl">Free invoice generator</h1>
        <p className="max-w-2xl text-lg text-pretty text-ink-muted">
          Free, no signup, and nothing you type leaves your browser.
        </p>
        <p className="text-sm text-ink-muted">
          Sending invoices every month?{" "}
          <AppLink
            to="signup"
            location="invoice_generator"
            onClick={() => captureEvent("invoice_generator_signup_clicked", { location: "page_top" })}
            className="font-medium text-ink underline underline-offset-2 transition-colors active:opacity-80 fine-hover:text-brand"
          >
            Try Travada Books
          </AppLink>
        </p>
      </div>
      <Generator />
    </Section>
  )
}
