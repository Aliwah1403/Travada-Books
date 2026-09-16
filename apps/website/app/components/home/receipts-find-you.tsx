import { Link } from "react-router"

import { GmailIcon, OutlookIcon } from "@travada-books/ui/icons"

import { ScreenshotFrame } from "~/components/screenshot-frame"
import { Section } from "~/components/section"

export function ReceiptsFindYou() {
  return (
    <Section>
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <div className="flex items-center gap-2">
            <GmailIcon size={20} />
            <OutlookIcon size={20} />
          </div>
          <h2 className="mt-4 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Your receipts find you.
          </h2>
          <p className="mt-4 max-w-[50ch] font-heading text-base/relaxed text-muted-foreground">
            Connect Gmail or Outlook. Receipts and supplier invoices that land in your inbox get
            pulled in automatically, matched to the bank transaction they belong to, and kept in
            your Vault — where you can search them later.
          </p>
          <Link
            to="/inbox"
            className="fine-hover:text-foreground mt-6 inline-block text-sm text-primary underline underline-offset-4"
          >
            See Inbox →
          </Link>
        </div>

        <ScreenshotFrame label="Inbox — receipt matched to transaction" />
      </div>
    </Section>
  )
}
