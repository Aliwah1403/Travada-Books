import { ArrowUpRight01Icon, Copy01Icon, MoreHorizontalIcon, ReloadIcon, WhatsappIcon } from "@travada-books/ui/icons"

import { MockButton, MockField, MockFrame, MockPanel, MockSwitch } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"
import { APP_URL } from "~/data/site"

// Sharing row: the Customer portal card on a customer's page (apps/app
// customers/customer-portal-card.tsx): the on/off switch, the private link,
// Copy link / Open / Share on WhatsApp, and the ⋯ menu with Regenerate
// link. The link follows the app's own domain. ⚠️ No M-Pesa on this page.

const PORTAL_LINK = `${APP_URL.replace(/^https?:\/\//, "")}/p/7kq2m9xw4t`

export function PortalSharingMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of the customer portal card on a customer's page: the portal switched on, its private link, buttons to copy it, open it or share it on WhatsApp, and a menu with Regenerate link, which makes the old link stop working."
    >
      <MockPanel className="mx-auto max-w-md p-4">
        <div {...revealStep(1)} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Customer portal</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Give this customer one link to see their invoices, quotes and statements.
            </p>
          </div>
          <MockSwitch on />
        </div>

        <div {...revealStep(2)} className="relative mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <MockField className="min-w-0 flex-1 font-mono">{PORTAL_LINK}</MockField>
            <MockButton className="h-9 w-9 bg-canvas px-0">
              <MoreHorizontalIcon className="size-4" aria-hidden="true" />
            </MockButton>
          </div>

          {/* The ⋯ menu, open. */}
          <div className="absolute top-11 right-0 z-10 w-44 border border-line bg-panel p-1 shadow-lg shadow-ink/10">
            <span className="flex items-center gap-2 bg-canvas px-2 py-1.5 text-xs">
              <ReloadIcon className="size-3.5 text-ink-muted" aria-hidden="true" />
              Regenerate link
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MockButton>
              <Copy01Icon className="size-3.5" aria-hidden="true" />
              Copy link
            </MockButton>
            <MockButton>
              <ArrowUpRight01Icon className="size-3.5" aria-hidden="true" />
              Open
            </MockButton>
            <MockButton>
              <WhatsappIcon className="size-3.5" aria-hidden="true" />
              Share on WhatsApp
            </MockButton>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
