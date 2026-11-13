import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../../context.js"
import { idempotency } from "../../middleware/idempotency.js"
import { requireCaller } from "../../middleware/require-caller.js"
import {
  addTagSchema,
  createFolderSchema,
  deleteDocumentsSchema,
  linkDocumentsSchema,
  moveDocumentsSchema,
  updateDocumentSchema,
} from "../../services/vault-schemas.js"
import * as svc from "../../services/vault.js"
import { serviceCtx, validate } from "./helpers.js"

// Domain 6c of API-WRITES-PLAN.md: vault documents, tags and folders. Thin
// wrappers over services/vault.ts.

const idParam = z.object({ id: z.uuid() })
const tagParam = z.object({ id: z.uuid(), tagId: z.uuid() })

export const vaultRoutes = new Hono<AppEnv>()
  .use(requireCaller)
  .use(idempotency)

  .post("/documents/delete", validate("json", deleteDocumentsSchema), async (c) => {
    const result = await svc.deleteDocuments(await serviceCtx(c), c.req.valid("json").ids)
    return c.json({ deleted: result.deleted })
  })

  .post("/documents/move", validate("json", moveDocumentsSchema), async (c) => {
    const { file_paths, folder_id } = c.req.valid("json")
    const result = await svc.moveDocuments(await serviceCtx(c), file_paths, folder_id)
    return c.json({ moved: result.moved })
  })

  .post("/documents/link", validate("json", linkDocumentsSchema), async (c) => {
    const { ids, transaction_id } = c.req.valid("json")
    const result = await svc.linkDocumentsToTransaction(await serviceCtx(c), ids, transaction_id)
    return c.json({ linked: result.linked })
  })

  .patch("/documents/:id", validate("param", idParam), validate("json", updateDocumentSchema), async (c) => {
    const { document } = await svc.updateDocument(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json"))
    return c.json({ document: { id: document.id, name: document.name, folder_id: document.folderId } })
  })

  .post("/documents/:id/tags", validate("param", idParam), validate("json", addTagSchema), async (c) => {
    const { tag } = await svc.addTag(await serviceCtx(c), c.req.valid("param").id, c.req.valid("json").name)
    return c.json({ tag }, 201)
  })

  .delete("/documents/:id/tags/:tagId", validate("param", tagParam), async (c) => {
    const { id, tagId } = c.req.valid("param")
    await svc.removeTag(await serviceCtx(c), id, tagId)
    return c.json({ removed: true })
  })

  .post("/folders", validate("json", createFolderSchema), async (c) => {
    const { name, parent_id } = c.req.valid("json")
    const { folder } = await svc.createFolder(await serviceCtx(c), name, parent_id)
    return c.json({ folder: { id: folder.id, org_id: folder.orgId, name: folder.name, is_system: folder.isSystem, parent_id: folder.parentId, created_at: folder.createdAt } }, 201)
  })

  .delete("/folders/:id", validate("param", idParam), async (c) => {
    await svc.deleteFolder(await serviceCtx(c), c.req.valid("param").id)
    return c.json({ deleted: true })
  })
