import type { ReactNode } from "react"

import { cn } from "@travada-books/ui/lib/utils"

import { SuggestedMatchMockup } from "~/components/feature/mockups/inbox/suggested-match"
import { MockPanel, MockPanelHeader, StatusPill } from "~/components/feature/mockups/primitives"
import { PortalSharingMockup } from "~/components/feature/mockups/customer-portal/portal-sharing"
import type { UpdateCoverId } from "~/lib/updates"

// Changelog covers: the green wave backdrop (public/images/updates/cover-bg.webp)
// with one product visual floating on it. Only the bigger updates set
// `cover:` in their frontmatter — most entries have no picture at all.
// The visuals reuse the coded product mockups so they stay true to the app.

// Compact part-paid invoice for the payments cover — the full-size payment
// mockups are too tall for a 16:10 cover. Same fictional figures as the
// /payments page (INV-0052, 40,000 of 85,000 paid).
function PartPaidInvoice() {
  const payments = [
    { date: "18 Sep 2026", method: "Bank Transfer", amount: "KES 25,000.00" },
    { date: "26 Sep 2026", method: "Cash", amount: "KES 15,000.00" },
  ]
  return (
    <MockPanel className="w-full max-w-md">
      <MockPanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-muted">INV-0052</span> Baraka Logistics
          </span>
        }
        aside={<StatusPill status="partial" />}
      />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink-muted">KES 40,000.00 of KES 85,000.00 paid</span>
          <span className="font-medium text-status-partial">KES 45,000.00 due</span>
        </div>
        <div className="h-1.5 bg-canvas">
          <div className="h-full w-[47%] bg-status-partial" />
        </div>
        <div className="divide-y divide-line border border-line">
          {payments.map((p) => (
            <div key={p.date} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-ink-muted">
                {p.date} · {p.method}
              </span>
              <span className="font-medium tabular-nums">{p.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </MockPanel>
  )
}

const VISUALS: Record<UpdateCoverId, ReactNode> = {
  inbox: <SuggestedMatchMockup className="w-full max-w-md" />,
  payments: <PartPaidInvoice />,
  portal: <PortalSharingMockup className="w-full max-w-md" />,
  website: (
    <div className="w-full max-w-xl border border-line bg-panel p-1 shadow-2xl shadow-ink/20">
      <img
        src="/images/updates/website-home.jpg"
        alt=""
        width={1440}
        height={900}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full border border-line"
      />
    </div>
  ),
}

export function UpdateCover({ cover, className }: { cover: UpdateCoverId; className?: string }) {
  return (
    <div data-cover aria-hidden="true" className={cn("relative aspect-16/10 overflow-hidden border border-line", className)}>
      <img
        src="/images/updates/cover-bg.webp"
        alt=""
        width={1920}
        height={1440}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="relative flex size-full items-center justify-center p-6 sm:p-10 [&_[role=img]]:shadow-2xl [&_[role=img]]:shadow-ink/20 [&>div]:shadow-2xl">
        {VISUALS[cover]}
      </div>
    </div>
  )
}
