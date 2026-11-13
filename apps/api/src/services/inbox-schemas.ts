import { z } from "zod"

export const INBOX_STATUSES = ["new", "processing", "analyzing", "suggested_match", "no_match", "pending", "done", "archived", "deleted"] as const

export const deleteInboxItemsSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) })
export const inboxStatusSchema = z.object({ status: z.enum(INBOX_STATUSES) })
export const matchInboxSchema = z.object({ transaction_id: z.uuid() })
export const blocklistEntrySchema = z.object({
  type: z.enum(["email", "domain"]),
  value: z.string().trim().toLowerCase().min(3).max(320),
})
