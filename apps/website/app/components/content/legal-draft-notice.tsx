import type { ReactNode } from "react"

import { Alert01Icon } from "@travada-books/ui/icons"

// Banner on legal pages whose MDX still has `placeholder: true`.
export function LegalDraftNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 border border-line-strong bg-canvas px-5 py-4">
      <Alert01Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <div>
        <p className="font-mono text-xs tracking-wide text-ink uppercase">Draft — under review</p>
        <p className="mt-1.5 text-sm text-pretty text-ink-muted">{children}</p>
      </div>
    </div>
  )
}
