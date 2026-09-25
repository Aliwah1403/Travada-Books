import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";

// Daily sweep: once an export's signed-URL window has passed, the ZIP parts
// are no longer downloadable anyway — remove them from storage and clear
// file_paths so the row (and its status/history) stays around without the
// dead weight.
export const orgExportCleanup = schedules.task({
  id: "org-export-cleanup",
  cron: "0 3 * * *",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    const { data: expired, error } = await supabase
      .from("org_data_exports")
      .select("id, file_paths")
      .lt("expires_at", new Date().toISOString())
      .not("file_paths", "is", null);

    if (error) throw new Error(`Failed to query expired exports: ${error.message}`);
    if (!expired || expired.length === 0) {
      logger.info("Org export cleanup: nothing to do");
      return { cleaned: 0 };
    }

    let cleaned = 0;

    for (const row of expired as { id: string; file_paths: string[] | null }[]) {
      const paths = row.file_paths ?? [];
      if (paths.length === 0) continue;

      const { error: removeError } = await supabase.storage.from("org-exports").remove(paths);
      if (removeError) {
        logger.error("Failed to remove expired export files", { exportId: row.id, error: removeError.message });
        continue;
      }

      const { error: updateError } = await supabase
        .from("org_data_exports")
        .update({ file_paths: [] })
        .eq("id", row.id);
      if (updateError) {
        logger.error("Failed to clear file_paths after cleanup", { exportId: row.id, error: updateError.message });
        continue;
      }

      cleaned += 1;
    }

    logger.info("Org export cleanup complete", { cleaned, total: expired.length });
    return { cleaned };
  },
});
