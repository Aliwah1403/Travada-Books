import { Csv01Icon } from "@travada-books/ui/icons"

import { MockButton, MockField, MockFrame, MockPanel, MockPanelHeader } from "~/components/feature/mockups/primitives"
import { revealStep } from "~/components/feature/mockups/reveal"

// Import row: the app's CSV import dialog on its "Map columns" step
// (apps/app import-csv-dialog.tsx). Each of the file's columns is matched
// to a Travada Books field automatically, with the first row's value shown
// under it as a preview. Fictional statement, fictional values.

const MAPPINGS = [
  { from: "Txn Date", to: "Date", preview: "03/09/2026" },
  { from: "Narrative", to: "Description", preview: "POS PURCHASE KAHAWA HOUSE WESTLANDS" },
  { from: "Ref No", to: "Reference", preview: "FT26246K7P2Q" },
  { from: "Ccy", to: "Currency", preview: "KES" },
]

const GRID = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 @sm:gap-3"

export function ColumnMappingMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      className={className}
      label="Illustration of importing a bank statement CSV: its Txn Date, Narrative, Ref No and Ccy columns have been mapped automatically to Date, Description, Reference and Currency, each with a preview from the first row, ready to confirm."
    >
      <MockPanel className="mx-auto max-w-md">
        <MockPanelHeader
          title="Map columns"
          aside={
            <>
              <Csv01Icon className="size-4 text-ink-subtle" aria-hidden="true" />
              <span className="hidden @sm:inline">statement-sep-2026.csv</span>
            </>
          }
        />
        <div className="flex flex-col gap-4 p-4">
          <p {...revealStep(1)} className="text-xs text-ink-muted">
            We've mapped each column automatically — review and confirm before importing.
          </p>

          <div {...revealStep(2)} className={GRID}>
            <span className="font-mono text-xs tracking-wide text-ink-subtle uppercase">Your file</span>
            <span />
            <span className="font-mono text-xs tracking-wide text-ink-subtle uppercase">Travada Books</span>
          </div>

          <div className="flex flex-col gap-3">
            {MAPPINGS.map((mapping, index) => (
              <div key={mapping.to} {...revealStep(3 + index)} className="flex flex-col gap-1">
                <div className={GRID}>
                  <MockField select>{mapping.from}</MockField>
                  <span className="text-xs text-ink-subtle" aria-hidden="true">
                    →
                  </span>
                  <div className="flex h-9 items-center border border-dashed border-line-strong bg-canvas px-2.5 text-xs text-ink-muted">
                    {mapping.to}
                  </div>
                </div>
                <p className="truncate pl-1 text-xs text-ink-subtle">{mapping.preview}</p>
              </div>
            ))}
          </div>

          <div {...revealStep(7)} className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="text-xs text-ink-muted">214 rows · first row preview shown above</p>
            <MockButton variant="primary" className="h-9 w-full">
              Confirm import
            </MockButton>
          </div>
        </div>
      </MockPanel>
    </MockFrame>
  )
}
