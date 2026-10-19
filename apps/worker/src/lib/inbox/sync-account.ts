import { logger, tasks } from "@trigger.dev/sdk";
import { supabase } from "../supabase";
import { notifyInbox } from "../notify-inbox";
import { getInboxAttachments } from "./connector";
import { InboxAuthError } from "./errors";
import type { Attachment } from "./types";
import type { processInboxAttachmentTask } from "../../trigger/process-inbox-attachment";

// Provider-sync size cap — tighter than the inbox-webhook's 25MB email cap
// (that path bounds a single attacker-controlled email; this path can run
// unattended every 6 hours against however much mail accumulated, so a
// smaller cap matters more here). Matches Midday's provider-sync constant
// and INBOX-PLAN.md's spec for this path.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// ── Helpers ported near-verbatim from supabase/functions/inbox-webhook/index.ts ──

function sanitizeFileName(name: string): string {
  const trimmed = (name || "attachment").slice(0, 200);
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function withRandomSuffix(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 4);
  if (dotIndex <= 0) return `${fileName}_${rand}`;
  return `${fileName.slice(0, dotIndex)}_${rand}${fileName.slice(dotIndex)}`;
}

interface BlocklistRow {
  type: string;
  value: string;
}

// Same shape as the webhook's isSenderBlocked, but built once per sync run
// (rather than queried per-email) and checked against each attachment's
// sender/domain in memory. Fails open (not blocked) on a DB read error.
async function loadBlocklistChecker(orgId: string): Promise<(attachment: Attachment) => boolean> {
  const { data, error } = await supabase.from("inbox_blocklist").select("type, value").eq("org_id", orgId);

  if (error) {
    logger.error("syncInboxAccount: blocklist lookup failed, failing open", {
      orgId,
      error: error.message,
    });
    return () => false;
  }

  const rows = (data ?? []) as BlocklistRow[];

  return (attachment: Attachment) => {
    const senderEmail = attachment.senderEmail?.toLowerCase() ?? "";
    const domain = attachment.website?.toLowerCase() ?? senderEmail.split("@")[1] ?? "";

    return rows.some(
      (row) =>
        (row.type === "email" && senderEmail && row.value === senderEmail) ||
        (row.type === "domain" && domain && row.value === domain),
    );
  };
}

export async function syncInboxAccount(
  accountId: string,
  options: { fullSync: boolean },
): Promise<{ inserted: number }> {
  const { data: account, error: accountError } = await supabase
    .from("inbox_accounts")
    .select("org_id, provider")
    .eq("id", accountId)
    .single();

  if (accountError || !account) {
    throw new Error(`Inbox account not found: ${accountError?.message ?? accountId}`);
  }

  const orgId = account.org_id as string;

  let attachments: Attachment[];
  try {
    attachments = await getInboxAttachments(accountId, {
      fullSync: options.fullSync,
      maxResults: 50,
    });
  } catch (err) {
    if (err instanceof InboxAuthError && err.requiresReauth) {
      logger.warn("syncInboxAccount: reauth required, marking account disconnected", {
        accountId,
        orgId,
        error: err.message,
      });
      await supabase
        .from("inbox_accounts")
        .update({ status: "disconnected", error_message: err.message })
        .eq("id", accountId);
      return { inserted: 0 };
    }

    // Transient auth errors and sync errors propagate — the caller task's
    // own retry config handles those, and we must not touch account status
    // for a problem that might just resolve on the next attempt.
    throw err;
  }

  if (attachments.length === 0) {
    await supabase
      .from("inbox_accounts")
      .update({ last_accessed: new Date().toISOString(), status: "connected", error_message: null })
      .eq("id", accountId);
    return { inserted: 0 };
  }

  const isBlocked = await loadBlocklistChecker(orgId);

  let eligible = attachments.filter((attachment) => {
    if (attachment.size > MAX_ATTACHMENT_BYTES) return false;
    if (isBlocked(attachment)) return false;
    return true;
  });

  // Skip already-imported attachments BEFORE uploading — every vault upload
  // fires handle_vault_upload (creating a documents row), so uploading then
  // hitting the reference_id unique index would leave an orphaned duplicate.
  // No org filter: idx_inbox_items_reference_id is global, so match it.
  if (eligible.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("inbox_items")
      .select("reference_id")
      .in(
        "reference_id",
        eligible.map((attachment) => attachment.referenceId),
      );

    if (existingError) {
      // Fall back to the unfiltered list — the insert-failure cleanup below
      // still prevents orphans.
      logger.error("syncInboxAccount: existing reference_id lookup failed, proceeding unfiltered", {
        accountId,
        orgId,
        error: existingError.message,
      });
    } else {
      const seen = new Set((existing ?? []).map((row) => row.reference_id as string));
      const before = eligible.length;
      // Also dedupes within the batch (keeps the first occurrence).
      eligible = eligible.filter((attachment) => {
        if (seen.has(attachment.referenceId)) return false;
        seen.add(attachment.referenceId);
        return true;
      });
      const skipped = before - eligible.length;
      if (skipped > 0) {
        logger.info("syncInboxAccount: skipped already-imported attachments", {
          accountId,
          orgId,
          skipped,
        });
      }
    }
  }

  const inserted: { id: string; display_name: string }[] = [];

  for (const attachment of eligible) {
    const sanitized = sanitizeFileName(attachment.filename);
    const uniqueName = withRandomSuffix(sanitized);
    const filePath = `${orgId}/inbox/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(filePath, attachment.data, { contentType: attachment.mimeType, upsert: false });

    if (uploadError) {
      logger.error("syncInboxAccount: attachment upload failed", {
        accountId,
        orgId,
        filePath,
        error: uploadError.message,
      });
      continue;
    }

    const { data: item, error: insertError } = await supabase
      .from("inbox_items")
      .insert({
        org_id: orgId,
        file_path: filePath,
        file_name: uniqueName,
        content_type: attachment.mimeType,
        size: attachment.size,
        display_name: sanitized,
        sender_email: attachment.senderEmail ?? null,
        reference_id: attachment.referenceId,
        inbox_account_id: accountId,
        status: "new",
        meta: { source: account.provider },
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        logger.info("syncInboxAccount: duplicate reference_id, skipping", {
          accountId,
          orgId,
          referenceId: attachment.referenceId,
        });
      } else {
        logger.error("syncInboxAccount: inbox_items insert failed", {
          accountId,
          orgId,
          error: insertError.message,
        });
      }

      // The upload already created a storage object and (via trigger) a
      // documents row — remove both so a failed insert leaves no orphan.
      const { error: removeError } = await supabase.storage.from("vault").remove([filePath]);
      if (removeError) {
        logger.error("syncInboxAccount: orphan storage cleanup failed", {
          accountId,
          orgId,
          filePath,
          error: removeError.message,
        });
      }
      const { error: docDeleteError } = await supabase.from("documents").delete().eq("file_path", filePath);
      if (docDeleteError) {
        logger.error("syncInboxAccount: orphan documents cleanup failed", {
          accountId,
          orgId,
          filePath,
          error: docDeleteError.message,
        });
      }
      continue;
    }

    inserted.push({ id: item.id, display_name: sanitized });

    // Per-attachment, not per-run — Novu's inbox-new digest step merges
    // events within its window, so firing one call per document keeps
    // steps.digest.eventCount an accurate document count.
    await notifyInbox("inbox.new", orgId, { documentName: sanitized });

    try {
      await tasks.trigger<typeof processInboxAttachmentTask>("process-inbox-attachment", {
        inboxItemId: item.id,
      });
    } catch (err) {
      logger.error("syncInboxAccount: failed to trigger process-inbox-attachment", {
        accountId,
        orgId,
        inboxItemId: item.id,
        error: String(err),
      });
    }
  }

  await supabase
    .from("inbox_accounts")
    .update({ last_accessed: new Date().toISOString(), status: "connected", error_message: null })
    .eq("id", accountId);

  return { inserted: inserted.length };
}
