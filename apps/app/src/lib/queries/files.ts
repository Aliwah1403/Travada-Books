import { supabase } from "@/lib/supabase"

// One stored file can be shared: a receipt matched from the inbox is both the
// inbox document and the transaction's attachment, every upload also has a
// Vault row, and invoice/quote/statement PDFs show in the Vault too. So after
// a delete, only remove files nothing else still points at. Same rule as the
// API's services/files.ts. RLS keeps these reads inside the caller's org.

const FILE_TABLES = ["documents", "transaction_attachments", "inbox_items", "invoices", "quotes", "statements"] as const

/** Of `paths`, the ones no row references any more. Call after the delete. */
export async function unusedPaths(paths: string[]): Promise<string[]> {
  const unique = [...new Set(paths)]
  if (unique.length === 0) return []
  const used = new Set<string>()
  for (const table of FILE_TABLES) {
    const { data, error } = await supabase.from(table).select("file_path").in("file_path", unique)
    // If we can't tell, keep the files: a stray file is harmless, a broken receipt isn't.
    if (error) return []
    for (const row of (data ?? []) as { file_path: string | null }[]) if (row.file_path) used.add(row.file_path)
  }
  return unique.filter((p) => !used.has(p))
}

/** Remove the given files from the vault bucket, but only those nothing uses. */
export async function removeUnusedFiles(paths: string[]): Promise<void> {
  const removable = await unusedPaths(paths)
  if (removable.length) await supabase.storage.from("vault").remove(removable)
}
