import { task, logger } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/render";
import { buildOrgExport, signExportUrls } from "../lib/org-export";
import { OrgDataExportedEmail } from "../emails/org-data-exported";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const FROM_EMAIL = "noreply@mail.travadasys.com";

export type ExportOrgDataPayload = {
  exportId: string;
  orgId: string;
  emailTo: string;
  reason: "manual" | "org_deletion";
  expiresInDays: number;
};

export const exportOrgDataTask = task({
  id: "export-org-data",
  machine: { preset: "medium-1x" },
  maxDuration: 1800,
  retry: { maxAttempts: 2 },
  run: async (payload: ExportOrgDataPayload) => {
    const { exportId, orgId, emailTo, reason, expiresInDays } = payload;
    const supabase = getSupabase();

    try {
      logger.info("Starting org data export", { exportId, orgId, reason });

      const { filePaths, itemCount, skippedFiles } = await buildOrgExport(supabase, { orgId, exportId });
      if (skippedFiles.length > 0) {
        logger.warn("Some files could not be included in the export", { exportId, skipped: skippedFiles.length });
      }

      const signedUrls = await signExportUrls(supabase, filePaths, expiresInDays);

      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("org_data_exports")
        .update({ status: "completed", file_paths: filePaths, item_count: itemCount, expires_at: expiresAt })
        .eq("id", exportId);
      if (updateError) throw new Error(`Failed to update export record: ${updateError.message}`);

      logger.info("Sending export email", { exportId, emailTo });

      const { data: org } = await supabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", orgId)
        .single();

      const html = await render(
        React.createElement(OrgDataExportedEmail, {
          orgName: org?.name ?? "Your organisation",
          orgLogoUrl: org?.logo_url ?? null,
          itemCount,
          partCount: signedUrls.length,
          exportDate: new Date().toISOString(),
          downloadUrls: signedUrls,
          expiresInDays,
        }),
      );

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: emailError } = await resend.emails.send({
        from: `Travada Books <${FROM_EMAIL}>`,
        to: [emailTo],
        subject: "Your data export is ready",
        html,
      });

      if (emailError) {
        logger.warn("Failed to send export email", { error: (emailError as { message: string }).message });
      }

      logger.info("Org data export complete", { exportId, orgId, itemCount, parts: filePaths.length });
      return { filePaths, itemCount, skippedFiles };
    } catch (err) {
      logger.error("Org data export attempt failed", { exportId, error: String(err) });
      throw err;
    }
  },
  // Only after the final attempt — marking the row failed from `run` would
  // show "Last export failed" in the UI while a retry is still on its way.
  onFailure: async ({ payload, error }) => {
    await getSupabase()
      .from("org_data_exports")
      .update({ status: "failed", error: String(error) })
      .eq("id", payload.exportId);
  },
});
