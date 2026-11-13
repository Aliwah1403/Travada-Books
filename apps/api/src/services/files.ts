import { and, eq, inArray } from "drizzle-orm"
import type { DbOrTx } from "../db/client.js"
import { documents, inboxItems, invoices, quotes, statements, transactionAttachments } from "../db/schema.js"

// One stored file can be shared: a receipt matched from the inbox is both the
// inbox document and the transaction's attachment, every upload also has a
// Vault row, and invoice/quote/statement PDFs show in the Vault too. So after
// a delete, a file may only be removed if nothing else still points at it.

/** Of `paths`, the ones no row in the org references any more. Call after the delete. */
export async function unusedPaths(db: DbOrTx, orgId: string, paths: string[]): Promise<string[]> {
  const unique = [...new Set(paths)]
  if (unique.length === 0) return []
  const tables = [documents, transactionAttachments, inboxItems, invoices, quotes, statements] as const
  const used = new Set<string>()
  for (const table of tables) {
    const rows = await db
      .select({ path: table.filePath })
      .from(table)
      .where(and(eq(table.orgId, orgId), inArray(table.filePath, unique)))
    for (const r of rows) if (r.path) used.add(r.path)
  }
  return unique.filter((p) => !used.has(p))
}
