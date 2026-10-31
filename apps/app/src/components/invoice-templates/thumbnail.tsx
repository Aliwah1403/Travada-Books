// Small sketches of each layout for the invoice and quote settings pickers.
const BAR = "rounded bg-muted-foreground/20"
const STRONG = "rounded bg-muted-foreground/30"
const RULE = "h-px w-full bg-muted-foreground/25"

export function TemplateThumbnail({ id }: { id: string }) {
  switch (id) {
    case "ledger":
      return (
        <div className="flex h-full flex-col gap-1 p-1.5">
          <div className="flex items-start justify-between">
            <div className={`h-1.5 w-7 ${STRONG}`} />
            <div className={`h-1.5 w-5 ${STRONG}`} />
          </div>
          <div className={`mt-0.5 ${RULE}`} />
          <div className="grid grid-cols-4 gap-0.5">
            <div className={`h-1 ${BAR}`} />
            <div className={`h-1 ${BAR}`} />
            <div className={`h-1 ${BAR}`} />
            <div className={`h-1 ${BAR}`} />
          </div>
          <div className={RULE} />
          <div className={RULE} />
          <div className={RULE} />
          <div className="mt-auto flex justify-end">
            <div className={`h-1.5 w-7 ${STRONG}`} />
          </div>
        </div>
      )
    case "banded":
      return (
        <div className="flex h-full flex-col gap-1 pt-1.5">
          <div className={`mx-auto h-1.5 w-8 ${STRONG}`} />
          <div className="flex justify-between px-1.5">
            <div className={`h-1 w-5 ${STRONG}`} />
            <div className={`h-1 w-3 ${BAR}`} />
          </div>
          <div className="flex flex-col px-1.5">
            <div className="h-1.5 w-full bg-muted-foreground/20" />
            <div className="h-1.5 w-full" />
            <div className="h-1.5 w-full bg-muted-foreground/20" />
          </div>
          <div className="mt-auto h-2.5 w-full bg-muted-foreground/20" />
        </div>
      )
    case "mono":
      return (
        <div className="flex h-full flex-col gap-1.5 p-1.5">
          <div className="flex items-start justify-between">
            <div className="size-3 bg-muted-foreground/40" />
            <div className="flex flex-col items-end gap-0.5">
              <div className={`h-0.5 w-7 ${STRONG}`} />
              <div className={`h-0.5 w-5 ${BAR}`} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_3fr] gap-1.5">
            <div className="flex flex-col gap-0.5">
              <div className={`h-0.5 ${STRONG}`} />
              <div className={`h-0.5 ${BAR}`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className={`h-0.5 ${STRONG}`} />
              <div className={`h-0.5 ${BAR}`} />
              <div className={`h-0.5 ${BAR}`} />
              <div className={`h-0.5 ${BAR}`} />
            </div>
          </div>
          <div className="mt-auto flex justify-end">
            <div className={`h-1 w-8 ${STRONG}`} />
          </div>
        </div>
      )
    default:
      return (
        <div className="flex h-full flex-col gap-1 p-1.5">
          <div className="flex items-start justify-between">
            <div className="size-3 rounded-sm bg-muted-foreground/30" />
            <div className={`h-1.5 w-8 ${BAR}`} />
          </div>
          <div className="mt-0.5 h-px w-full bg-muted-foreground/15" />
          <div className="flex flex-col gap-0.5">
            <div className={`h-1 w-10 ${BAR}`} />
            <div className="h-1 w-7 rounded bg-muted-foreground/15" />
          </div>
          <div className="mt-auto flex flex-col items-end gap-0.5">
            <div className={`h-1 w-8 ${BAR}`} />
            <div className="h-1 w-6 rounded bg-muted-foreground/15" />
            <div className={`h-1.5 w-10 ${STRONG}`} />
          </div>
        </div>
      )
  }
}
