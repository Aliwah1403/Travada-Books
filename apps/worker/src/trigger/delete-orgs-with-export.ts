import { task, logger, tasks, idempotencyKeys } from "@trigger.dev/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/render";
import {
  buildOrgExport,
  signExportUrls,
  listStorageFilesRecursive,
  type MemberExportRow,
} from "../lib/org-export";
import { OrgDeletedExportEmail, DeletionCancelledEmail } from "../emails/org-deleted-export";
import type { resendRemoveContact } from "./resend-remove-contact";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@mail.travadasys.com";
// Export-on-delete links always get the long window — by the time the owner
// gets around to downloading, the org is already gone.
const EXPORT_EXPIRES_IN_DAYS = 30;

// A raw `organization_members` row, all columns — re-inserted verbatim
// (upsert on `id`) if deletion has to be rolled back in onFailure.
export type MembershipSnapshot = Record<string, unknown>;

export type DeleteOrgsWithExportOrg = {
  orgId: string;
  orgName: string;
  exportId: string;
  memberships: MembershipSnapshot[];
  members: MemberExportRow[];
  pausedRecurringIds: string[];
};

export type DeleteOrgsWithExportPayload = {
  ownerEmail: string;
  orgs: DeleteOrgsWithExportOrg[];
  /** Set only by delete-account: the auth user to remove once every org is exported and deleted. */
  deleteUserId?: string;
};

type OrgEmailResult = { orgName: string; downloadUrls: string[] };

function isNotFoundError(err: { message?: string; status?: number } | null | undefined): boolean {
  if (!err) return false;
  if (err.status === 404) return true;
  return /not.?found/i.test(err.message ?? "");
}

// Reused by both the happy path (delete everything under an org's prefix)
// and — unlike buildOrgExport's purge-safe listing — with NO skipPrefixes,
// since by this point the org is gone and there's no reason to keep old
// transaction-export ZIPs under vault/{orgId}/exports/ around either.
async function purgeOrgStorage(supabase: SupabaseClient, orgId: string): Promise<void> {
  const sources: { bucket: string; prefix: string }[] = [
    { bucket: "vault", prefix: orgId },
    { bucket: "transaction-attachments", prefix: orgId },
    { bucket: "org-assets", prefix: `logos/${orgId}` },
  ];

  for (const source of sources) {
    try {
      const paths = await listStorageFilesRecursive(supabase, source.bucket, source.prefix);
      if (paths.length === 0) continue;

      for (let i = 0; i < paths.length; i += 1000) {
        const batch = paths.slice(i, i + 1000);
        const { error } = await supabase.storage.from(source.bucket).remove(batch);
        if (error) {
          logger.warn("Failed to remove a storage batch while purging org", {
            orgId,
            bucket: source.bucket,
            error: error.message,
          });
        }
      }
    } catch (err) {
      // Best-effort — never throw. A stray orphaned file is far less bad
      // than blocking (and repeatedly retrying) the whole deletion over it.
      logger.warn("Failed to list/purge storage for org, skipping", {
        orgId,
        bucket: source.bucket,
        error: String(err),
      });
    }
  }
}

export const deleteOrgsWithExportTask = task({
  id: "delete-orgs-with-export",
  machine: { preset: "medium-1x" },
  maxDuration: 3600,
  retry: { maxAttempts: 3 },
  run: async (payload: DeleteOrgsWithExportPayload) => {
    const { ownerEmail, orgs, deleteUserId } = payload;
    const supabase = getSupabase();

    const orgResults: OrgEmailResult[] = [];

    for (const org of orgs) {
      logger.info("Processing org deletion", { orgId: org.orgId, exportId: org.exportId });

      // ── Step 1: export (idempotent) ─────────────────────────────────────
      // Retries re-run this whole function from the top, so on a retry the
      // export from the previous attempt may already be `completed` — skip
      // rebuilding it (buildOrgExport re-queries live tables, which by now
      // may be gone if a later step already ran) and just reuse its paths.
      const { data: existingExport, error: fetchExportError } = await supabase
        .from("org_data_exports")
        .select("status, file_paths")
        .eq("id", org.exportId)
        .single();
      if (fetchExportError || !existingExport) {
        throw new Error(`Failed to load export row ${org.exportId} for org ${org.orgId}: ${fetchExportError?.message ?? "not found"}`);
      }

      let filePaths: string[] = (existingExport.file_paths as string[] | null) ?? [];

      if (existingExport.status !== "completed") {
        const result = await buildOrgExport(supabase, {
          orgId: org.orgId,
          exportId: org.exportId,
          members: org.members,
        });
        if (result.skippedFiles.length > 0) {
          logger.warn("Some files could not be included in the export", {
            orgId: org.orgId,
            skipped: result.skippedFiles.length,
          });
        }

        filePaths = result.filePaths;
        const expiresAt = new Date(Date.now() + EXPORT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("org_data_exports")
          .update({
            status: "completed",
            file_paths: filePaths,
            item_count: result.itemCount,
            expires_at: expiresAt,
          })
          .eq("id", org.exportId);
        if (updateError) {
          throw new Error(`Failed to update export record for org ${org.orgId}: ${updateError.message}`);
        }
      }

      // ── Step 2: delete the organizations row (idempotent — skip if gone) ─
      const { data: existingOrg, error: orgFetchError } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", org.orgId)
        .maybeSingle();
      if (orgFetchError) {
        throw new Error(`Failed to check organisation ${org.orgId}: ${orgFetchError.message}`);
      }

      if (existingOrg) {
        const { error: deleteOrgError } = await supabase.from("organizations").delete().eq("id", org.orgId);
        if (deleteOrgError) {
          throw new Error(`Failed to delete organisation ${org.orgId}: ${deleteOrgError.message}`);
        }
      }

      // ── Step 3: purge storage — best-effort, never throw ─────────────────
      await purgeOrgStorage(supabase, org.orgId);

      // Sign fresh links for the final email (export is guaranteed
      // `completed` by this point — steps above throw otherwise).
      const signedUrls = await signExportUrls(supabase, filePaths, EXPORT_EXPIRES_IN_DAYS);
      orgResults.push({ orgName: org.orgName, downloadUrls: signedUrls });
    }

    // ── After all orgs: delete the auth user, if this is an account deletion ─
    if (deleteUserId) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(deleteUserId);
      if (deleteUserError && !isNotFoundError(deleteUserError)) {
        throw new Error(`Failed to delete auth user ${deleteUserId}: ${deleteUserError.message}`);
      }

      // Scoped to this run by default, so retries reuse the same key —
      // triggering the contact-removal task at most once per run.
      const removeContactKey = await idempotencyKeys.create(`resend-remove-contact-${deleteUserId}`);
      await tasks.trigger<typeof resendRemoveContact>(
        "resend-remove-contact",
        { email: ownerEmail },
        { idempotencyKey: removeContactKey },
      );
    }

    // ── Final: send ONE email ────────────────────────────────────────────
    // Everything above is safe to repeat on retry. This send is the one
    // step that isn't idempotent by construction, so it's guarded with a
    // Resend-level idempotency key (stable across retries of this run) —
    // a crash between "Resend accepted it" and "this function returning"
    // won't produce a duplicate.
    logger.info("Sending deletion email", { ownerEmail, orgCount: orgResults.length });

    const html = await render(
      React.createElement(OrgDeletedExportEmail, {
        orgs: orgResults,
        expiresInDays: EXPORT_EXPIRES_IN_DAYS,
      }),
    );

    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailIdempotencyKey = await idempotencyKeys.create(
      `delete-orgs-email-${orgs.map((o) => o.exportId).sort().join("-")}`,
    );

    const { error: emailError } = await resend.emails.send(
      {
        from: `Travada Books <${FROM_EMAIL}>`,
        to: [ownerEmail],
        subject:
          orgResults.length === 1 ?
            `${orgResults[0].orgName} has been deleted — here's your data`
          : "Your organisations have been deleted — here's your data",
        html,
      },
      { idempotencyKey: emailIdempotencyKey },
    );

    // Unlike the manual export, this email is the owner's only route to their
    // data — the org is gone. Throw so the run retries; every earlier step is
    // idempotent and the key above stops a duplicate send.
    if (emailError) {
      throw new Error(`Failed to send deletion email: ${(emailError as { message: string }).message}`);
    }

    logger.info("Org deletion complete", { orgCount: orgs.length, deletedUser: !!deleteUserId });
    return { deletedOrgIds: orgs.map((o) => o.orgId), emailedTo: ownerEmail };
  },

  // Final attempt only. Anything still standing gets put back exactly as it
  // was — a failed deletion must never leave an org half-deleted or its
  // members permanently paused/locked out.
  onFailure: async ({ payload, error }) => {
    const supabase = getSupabase();
    const { orgs, deleteUserId, ownerEmail } = payload;

    const stillExisting: DeleteOrgsWithExportOrg[] = [];
    const deletedOrgResults: OrgEmailResult[] = [];

    for (const org of orgs) {
      const { data: existingOrg, error: orgFetchError } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", org.orgId)
        .maybeSingle();

      if (orgFetchError) {
        logger.error("onFailure: failed to check organisation existence, treating as not deleted", {
          orgId: org.orgId,
          error: orgFetchError.message,
        });
        stillExisting.push(org);
        continue;
      }

      if (existingOrg) {
        stillExisting.push(org);
        continue;
      }

      // Already deleted before the failure — only possible when a later org
      // in a multi-org account deletion failed. If its export completed,
      // give the owner a link; otherwise just note it was removed.
      const { data: exportRow } = await supabase
        .from("org_data_exports")
        .select("status, file_paths")
        .eq("id", org.exportId)
        .maybeSingle();

      const filePaths = (exportRow?.file_paths as string[] | null) ?? [];
      if (exportRow?.status === "completed" && filePaths.length > 0) {
        try {
          const urls = await signExportUrls(supabase, filePaths, EXPORT_EXPIRES_IN_DAYS);
          deletedOrgResults.push({ orgName: org.orgName, downloadUrls: urls });
        } catch (err) {
          logger.error("onFailure: failed to sign urls for an already-deleted org", {
            orgId: org.orgId,
            error: String(err),
          });
          deletedOrgResults.push({ orgName: org.orgName, downloadUrls: [] });
        }
      } else {
        deletedOrgResults.push({ orgName: org.orgName, downloadUrls: [] });
      }
    }

    // Roll back every org whose deletion did NOT go through.
    for (const org of stillExisting) {
      if (org.memberships.length > 0) {
        const { error: upsertError } = await supabase
          .from("organization_members")
          .upsert(org.memberships, { onConflict: "id" });
        if (upsertError) {
          logger.error("onFailure: failed to restore memberships", { orgId: org.orgId, error: upsertError.message });
        }
      }

      if (org.pausedRecurringIds.length > 0) {
        const { error: unpauseError } = await supabase
          .from("invoice_recurring")
          .update({ status: "active" })
          .in("id", org.pausedRecurringIds)
          .eq("status", "paused");
        if (unpauseError) {
          logger.error("onFailure: failed to unpause recurring invoices", {
            orgId: org.orgId,
            error: unpauseError.message,
          });
        }
      }

      const { error: failExportError } = await supabase
        .from("org_data_exports")
        .update({ status: "failed", error: String(error) })
        .eq("id", org.exportId);
      if (failExportError) {
        logger.error("onFailure: failed to mark export failed", { orgId: org.orgId, error: failExportError.message });
      }
    }

    // Unban the user if account deletion didn't finish and they still exist.
    let userStillExists = false;
    if (deleteUserId) {
      const { data: userCheck, error: userCheckError } = await supabase.auth.admin.getUserById(deleteUserId);
      if (!userCheckError && userCheck?.user) {
        userStillExists = true;
        const { error: unbanError } = await supabase.auth.admin.updateUserById(deleteUserId, { ban_duration: "none" });
        if (unbanError) {
          logger.error("onFailure: failed to unban user", { deleteUserId, error: unbanError.message });
        }
      }
    }

    try {
      const html = await render(
        React.createElement(DeletionCancelledEmail, {
          cancelledOrgNames: stillExisting.map((o) => o.orgName),
          deletedOrgs: deletedOrgResults,
          accountDeleted: !!deleteUserId && !userStillExists,
        }),
      );

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: emailError } = await resend.emails.send({
        from: `Travada Books <${FROM_EMAIL}>`,
        to: [ownerEmail],
        subject: "We couldn't finish your deletion",
        html,
      });
      if (emailError) {
        logger.error("onFailure: failed to send cancellation email", { error: (emailError as { message: string }).message });
      }
    } catch (err) {
      logger.error("onFailure: failed to build/send cancellation email", { error: String(err) });
    }
  },
});
