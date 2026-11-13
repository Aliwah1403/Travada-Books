import { createColumnConfigHelper } from "@bazza-ui/filters";
import { Calendar01Icon, Tag01Icon } from "@travada-books/ui/icons";
import { parseDateOnly } from "@/lib/format-date";

type VaultRow = {
  date: string | null;
  tagId: string | null;
};

const dtf = createColumnConfigHelper<VaultRow>();

/**
 * The rows handed to useDataTableFilters. These pages filter elsewhere (the
 * server, or the page itself), so it's always empty — but typing it is what
 * lets the hook infer the row type instead of `unknown`. One shared constant
 * so the hook's memo doesn't rebuild columns every render.
 */
export const FILTER_ROWS: VaultRow[] = [];

export function createVaultColumnsConfig(tags: { id: string; name: string }[]) {
  const tagOptions = tags.map((t) => ({ value: t.id, label: t.name }));

  return [
    dtf
      .date()
      .id("date")
      .accessor((row) => (row.date ? parseDateOnly(row.date) : new Date()))
      .displayName("Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .option()
      .id("tag")
      .accessor((row) => row.tagId ?? "")
      .displayName("Tags")
      .icon(Tag01Icon)
      .options(tagOptions)
      .build(),
  ] as const;
}

export type VaultColumnsConfig = ReturnType<typeof createVaultColumnsConfig>;
