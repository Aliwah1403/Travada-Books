import { and, eq, inArray, ne } from "drizzle-orm"
import { type DbOrTx, inOrg } from "../db/client.js"
import {
  documents,
  inboxBlocklist,
  inboxItems,
  transactionAttachments,
  transactionMatchSuggestions,
  transactions,
  users,
} from "../db/schema.js"
import { mapDbError, ServiceError } from "../lib/errors.js"
import { followUp, type ServiceCtx } from "./invoices.js"

// Inbox writes (API-WRITES-PLAN.md §6, domain 6b). The /v1/inbox routes (the
// app) and the assistant's tools both call these. Uploading a file into the
// inbox stays in the app (storage upload + row + processing kick-off).
//
// Matching attaches the inbox document's file to the transaction: the file
// already sits in the vault bucket, so the attachment row just points at the
// same path — nothing is copied, and unmatching never removes the file.

type Ctx = Pick<ServiceCtx, "db" | "orgId">

export async function getInboxRow(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(inboxItems).where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Inbox document not found.")
  return row
}

export type InboxRow = Awaited<ReturnType<typeof getInboxRow>>

const documentName = (item: Pick<InboxRow, "displayName" | "fileName">) => item.displayName || item.fileName

/**
 * Delete inbox documents. Their files go after commit; so do the Vault rows
 * the upload trigger made for them and, for matched ones, the transaction
 * attachment that pointed at the same file (otherwise the transaction keeps a
 * broken receipt). Bills made from them are deleted too (bills.inbox_item_id
 * cascades).
 */
export async function deleteInboxItems(ctx: ServiceCtx, ids: string[]) {
  const rows = await ctx.db
    .select({ id: inboxItems.id, filePath: inboxItems.filePath, attachmentId: inboxItems.attachmentId })
    .from(inboxItems)
    .where(inOrg(inboxItems, ctx.orgId, inArray(inboxItems.id, ids)))
  if (rows.length === 0) throw new ServiceError(404, "NOT_FOUND", ids.length === 1 ? "Inbox document not found." : "None of those documents were found.")
  const paths = rows.map((r) => r.filePath)
  await ctx.db.transaction(async (tx) => {
    await tx.delete(inboxItems).where(inOrg(inboxItems, ctx.orgId, inArray(inboxItems.id, rows.map((r) => r.id))))
    await tx.delete(documents).where(and(eq(documents.orgId, ctx.orgId), inArray(documents.filePath, paths)))
    const attachmentIds = rows.flatMap((r) => (r.attachmentId ? [r.attachmentId] : []))
    if (attachmentIds.length) {
      await tx.delete(transactionAttachments).where(inOrg(transactionAttachments, ctx.orgId, inArray(transactionAttachments.id, attachmentIds)))
    }
  })
  await followUp(() => ctx.effects.removeVaultFiles(paths))
  return { deleted: rows.length }
}

export async function setInboxStatus(ctx: ServiceCtx, id: string, status: string) {
  const [row] = await ctx.db.update(inboxItems).set({ status }).where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, id))).returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Inbox document not found.")
  return { item: row }
}

/** Attach the item's file to the transaction and mark the item done (caller holds the transaction). */
async function attach(tx: DbOrTx, ctx: ServiceCtx, item: InboxRow, transactionId: string) {
  if (item.transactionId && item.transactionId !== transactionId) {
    throw new ServiceError(409, "INVALID_STATE", "This document is already matched to another transaction. Unmatch it first.")
  }
  if (item.transactionId === transactionId) return
  const [attachment] = await tx
    .insert(transactionAttachments)
    .values({
      transactionId,
      orgId: ctx.orgId,
      filePath: item.filePath,
      fileName: item.fileName,
      fileSize: item.size,
      contentType: item.contentType,
    })
    .returning({ id: transactionAttachments.id })
  await tx
    .update(inboxItems)
    .set({ transactionId, attachmentId: attachment!.id, status: "done" })
    .where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, item.id)))
}

async function getTransactionName(ctx: Ctx, id: string) {
  const [row] = await ctx.db
    .select({ name: transactions.name })
    .from(transactions)
    .where(inOrg(transactions, ctx.orgId, eq(transactions.id, id)))
    .limit(1)
  if (!row) throw new ServiceError(422, "VALIDATION_FAILED", "Transaction not found.", "transaction_id")
  return row.name
}

async function actorName(ctx: ServiceCtx) {
  const [row] = await ctx.db.select({ name: users.fullName }).from(users).where(eq(users.id, ctx.userId)).limit(1)
  return row?.name ?? null
}

/** Accept the matcher's suggestion: attach, mark done, record the outcome (feeds merchant learning). */
export async function confirmSuggestion(ctx: ServiceCtx, suggestionId: string) {
  const [suggestion] = await ctx.db
    .select()
    .from(transactionMatchSuggestions)
    .where(inOrg(transactionMatchSuggestions, ctx.orgId, eq(transactionMatchSuggestions.id, suggestionId)))
    .limit(1)
  if (!suggestion) throw new ServiceError(404, "NOT_FOUND", "Suggestion not found.")
  if (suggestion.status !== "pending") throw new ServiceError(409, "INVALID_STATE", `This suggestion was already ${suggestion.status}.`)
  const item = await getInboxRow(ctx, suggestion.inboxItemId)
  const transactionName = await getTransactionName(ctx, suggestion.transactionId)

  await ctx.db.transaction(async (tx) => {
    await attach(tx, ctx, item, suggestion.transactionId)
    await tx
      .update(transactionMatchSuggestions)
      .set({ status: "confirmed", userId: ctx.userId, userActionAt: new Date().toISOString() })
      .where(eq(transactionMatchSuggestions.id, suggestionId))
  })

  const name = await actorName(ctx)
  const notified = await followUp(() =>
    ctx.effects.notifyInbox("inbox.match_confirmed", ctx.orgId, {
      documentName: documentName(item),
      transactionName,
      inboxId: item.id,
      ...(name ? { actorName: name } : {}),
    }),
  )
  return { item: await getInboxRow(ctx, item.id), transactionId: suggestion.transactionId, notified }
}

/**
 * Decline a suggestion. The item drops back to manual matching ("pending");
 * other pending suggestions for it expire (not decline — the user never
 * rejected those, so a later run may suggest them again).
 */
export async function declineSuggestion(ctx: ServiceCtx, suggestionId: string) {
  const [suggestion] = await ctx.db
    .select()
    .from(transactionMatchSuggestions)
    .where(inOrg(transactionMatchSuggestions, ctx.orgId, eq(transactionMatchSuggestions.id, suggestionId)))
    .limit(1)
  if (!suggestion) throw new ServiceError(404, "NOT_FOUND", "Suggestion not found.")
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(transactionMatchSuggestions)
      .set({ status: "declined", userId: ctx.userId, userActionAt: new Date().toISOString() })
      .where(eq(transactionMatchSuggestions.id, suggestionId))
    await tx
      .update(transactionMatchSuggestions)
      .set({ status: "expired" })
      .where(
        and(
          eq(transactionMatchSuggestions.inboxItemId, suggestion.inboxItemId),
          eq(transactionMatchSuggestions.status, "pending"),
        ),
      )
    await tx.update(inboxItems).set({ status: "pending" }).where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, suggestion.inboxItemId)))
  })
  return { item: await getInboxRow(ctx, suggestion.inboxItemId) }
}

/**
 * Match by hand. Still records a confirmed suggestion so merchant learning
 * sees the choice (updating the live one for this pair if there is one — the
 * pair index is partial, so this can't be an ON CONFLICT upsert).
 */
export async function matchTransaction(ctx: ServiceCtx, inboxItemId: string, transactionId: string) {
  const item = await getInboxRow(ctx, inboxItemId)
  await getTransactionName(ctx, transactionId)
  const outcome = { matchType: "suggested", status: "confirmed", userId: ctx.userId, userActionAt: new Date().toISOString() }

  await ctx.db.transaction(async (tx) => {
    await attach(tx, ctx, item, transactionId)
    const [existing] = await tx
      .select({ id: transactionMatchSuggestions.id })
      .from(transactionMatchSuggestions)
      .where(
        and(
          eq(transactionMatchSuggestions.inboxItemId, inboxItemId),
          eq(transactionMatchSuggestions.transactionId, transactionId),
          ne(transactionMatchSuggestions.status, "expired"),
        ),
      )
      .limit(1)
    if (existing) await tx.update(transactionMatchSuggestions).set(outcome).where(eq(transactionMatchSuggestions.id, existing.id))
    else await tx.insert(transactionMatchSuggestions).values({ orgId: ctx.orgId, inboxItemId, transactionId, ...outcome })
  })
  return { item: await getInboxRow(ctx, inboxItemId) }
}

/** Detach the matched transaction. The file stays (the inbox document still shows it). */
export async function unmatchTransaction(ctx: ServiceCtx, inboxItemId: string) {
  const item = await getInboxRow(ctx, inboxItemId)
  await ctx.db.transaction(async (tx) => {
    if (item.attachmentId) {
      await tx.delete(transactionAttachments).where(inOrg(transactionAttachments, ctx.orgId, eq(transactionAttachments.id, item.attachmentId)))
    }
    await tx
      .update(inboxItems)
      .set({ transactionId: null, attachmentId: null, status: "pending" })
      .where(inOrg(inboxItems, ctx.orgId, eq(inboxItems.id, inboxItemId)))
    if (item.transactionId) {
      await tx
        .update(transactionMatchSuggestions)
        .set({ status: "unmatched" })
        .where(
          and(
            eq(transactionMatchSuggestions.inboxItemId, inboxItemId),
            eq(transactionMatchSuggestions.transactionId, item.transactionId),
            eq(transactionMatchSuggestions.status, "confirmed"),
          ),
        )
    }
  })
  return { item: await getInboxRow(ctx, inboxItemId) }
}

/** Re-run extraction and matching (stuck items, or a bad first match). */
export async function retryMatching(ctx: ServiceCtx, inboxItemId: string) {
  const { item } = await setInboxStatus(ctx, inboxItemId, "analyzing")
  try {
    await ctx.effects.processInboxItem(inboxItemId)
  } catch (error) {
    throw new ServiceError(502, "INTERNAL", "Couldn't start matching. Please try again.", undefined, error)
  }
  return { item }
}

// ─── Blocklist ──────────────────────────────────────────────────────────────

export async function addBlocklistEntry(ctx: ServiceCtx, type: "email" | "domain", value: string) {
  try {
    const [row] = await ctx.db.transaction((tx) => tx.insert(inboxBlocklist).values({ orgId: ctx.orgId, type, value }).returning())
    return { entry: row! }
  } catch (error) {
    throw mapDbError(error, {
      inbox_blocklist_org_id_type_value_key: { code: "CONFLICT", message: "That sender is already blocked.", field: "value" },
    })
  }
}

export async function removeBlocklistEntry(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db.delete(inboxBlocklist).where(inOrg(inboxBlocklist, ctx.orgId, eq(inboxBlocklist.id, id))).returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Blocked sender not found.")
  return { entry: row }
}

export function inboxServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getInboxRow(ctx, id),
    remove: (ids: string[]) => deleteInboxItems(ctx, ids),
    setStatus: (id: string, status: string) => setInboxStatus(ctx, id, status),
    confirmSuggestion: (suggestionId: string) => confirmSuggestion(ctx, suggestionId),
    declineSuggestion: (suggestionId: string) => declineSuggestion(ctx, suggestionId),
    match: (inboxItemId: string, transactionId: string) => matchTransaction(ctx, inboxItemId, transactionId),
    unmatch: (inboxItemId: string) => unmatchTransaction(ctx, inboxItemId),
    retry: (inboxItemId: string) => retryMatching(ctx, inboxItemId),
  }
}

export type InboxServices = ReturnType<typeof inboxServices>

