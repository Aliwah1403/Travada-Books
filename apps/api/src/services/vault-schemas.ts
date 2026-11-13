import { z } from "zod"

const ids = z.array(z.uuid()).min(1).max(200)

export const deleteDocumentsSchema = z.object({ ids })
export const updateDocumentSchema = z
  .object({
    name: z.string().trim().min(1).max(300),
    summary: z.string().trim().max(5000).nullable(),
    folder_id: z.uuid().nullable(),
  })
  .partial()
export const moveDocumentsSchema = z.object({
  /** The app addresses documents by storage path when moving them. */
  file_paths: z.array(z.string().min(1).max(500)).min(1).max(200),
  folder_id: z.uuid().nullable(),
})
export const addTagSchema = z.object({ name: z.string().trim().min(1).max(60) })
export const linkDocumentsSchema = z.object({ ids, transaction_id: z.uuid() })
export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  parent_id: z.uuid().nullable().default(null),
})

export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>
