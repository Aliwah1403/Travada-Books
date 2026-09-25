import { db } from "./db.ts"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  // Chunked to avoid blowing the call stack on String.fromCharCode(...bytes)
  // for a multi-MB PDF — same pattern as extract-document-data/index.ts.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

// Downloads a generated document PDF from the vault bucket and returns it in
// the shape Resend's `attachments` array expects. Returns null (never
// throws) if the file can't be found/downloaded — callers should fall back
// to sending without the attachment rather than failing the whole send.
export async function downloadPdfAttachment(
  filePath: string,
  filename: string,
): Promise<{ filename: string; content: string } | null> {
  try {
    const { data, error } = await db.storage.from("vault").download(filePath)
    if (error || !data) return null
    const buffer = await data.arrayBuffer()
    return { filename, content: arrayBufferToBase64(buffer) }
  } catch {
    return null
  }
}
