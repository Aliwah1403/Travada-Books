import { cn } from "@travada-books/ui/lib/utils";

export type EditorPane = "form" | "preview";

/**
 * Phone-only Form / Preview switch for the invoice and quote editors. From
 * `md` up both panes sit side by side and this is hidden.
 */
export function EditorPaneTabs({
  value,
  onChange,
}: {
  value: EditorPane;
  onChange: (pane: EditorPane) => void;
}) {
  return (
    <div className='shrink-0 border-b px-4 py-2 md:hidden'>
      <div role='tablist' className='grid grid-cols-2 gap-1 rounded-lg bg-muted p-1'>
        {(["form", "preview"] as const).map((pane) => (
          <button
            key={pane}
            type='button'
            role='tab'
            aria-selected={value === pane}
            onClick={() => onChange(pane)}
            className={cn(
              "rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
              value === pane ?
                "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
            )}
          >
            {pane}
          </button>
        ))}
      </div>
    </div>
  );
}
