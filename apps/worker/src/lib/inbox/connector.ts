import { supabase } from "../supabase";
import { decrypt } from "../crypto";
import { InboxAuthError, InboxSyncError } from "./errors";
import { GmailProvider } from "./gmail-provider";
import { OutlookProvider } from "./outlook-provider";
import type { Attachment, GetAttachmentsOptions } from "./types";

interface InboxAccountRow {
  id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expiry_date: string;
  last_accessed: string;
}

// Shared surface both providers satisfy, so the retry-after-refresh logic
// below is written once against the interface rather than duplicated per
// provider.
interface InboxProviderClient {
  setAccountId(id: string): void;
  setTokens(t: { access_token: string; refresh_token?: string | null; expiry_date?: number | null }): void;
  getAttachments(o: GetAttachmentsOptions): Promise<Attachment[]>;
  refreshTokens(): Promise<void>;
}

function createProvider(provider: string): InboxProviderClient {
  if (provider === "gmail") return new GmailProvider();
  if (provider === "outlook") return new OutlookProvider();
  throw new Error(`Unsupported inbox provider: ${provider}`);
}

export async function getInboxAttachments(
  accountId: string,
  options: GetAttachmentsOptions,
): Promise<Attachment[]> {
  const { data: account, error } = await supabase
    .from("inbox_accounts")
    .select("id, provider, access_token, refresh_token, expiry_date, last_accessed")
    .eq("id", accountId)
    .single<InboxAccountRow>();

  if (error || !account) {
    throw new Error(`Inbox account not found: ${error?.message ?? accountId}`);
  }

  const provider = createProvider(account.provider);
  provider.setAccountId(account.id);
  provider.setTokens({
    access_token: await decrypt(account.access_token),
    refresh_token: await decrypt(account.refresh_token),
    expiry_date: new Date(account.expiry_date).getTime(),
  });

  const fetchOptions: GetAttachmentsOptions = {
    maxResults: options.maxResults,
    fullSync: options.fullSync,
    lastAccessed: account.last_accessed,
  };

  try {
    return await provider.getAttachments(fetchOptions);
  } catch (err) {
    if (err instanceof InboxAuthError) {
      // Reauth-required errors mean the refresh token itself is dead — no
      // amount of retrying will fix that, so propagate immediately and let
      // the future task layer mark the account disconnected.
      if (err.requiresReauth) {
        throw err;
      }

      try {
        await provider.refreshTokens();
        return await provider.getAttachments(fetchOptions);
      } catch (retryErr) {
        if (retryErr instanceof InboxAuthError || retryErr instanceof InboxSyncError) {
          throw retryErr;
        }
        throw new InboxSyncError({
          code: "fetch_failed",
          provider: account.provider as "gmail" | "outlook",
          message: `Failed to fetch attachments after token refresh: ${
            retryErr instanceof Error ? retryErr.message : "Unknown error"
          }`,
          cause: retryErr instanceof Error ? retryErr : undefined,
        });
      }
    }

    if (err instanceof InboxSyncError) {
      throw err;
    }

    throw new InboxSyncError({
      code: "fetch_failed",
      provider: account.provider as "gmail" | "outlook",
      message: `Failed to fetch attachments: ${err instanceof Error ? err.message : "Unknown error"}`,
      cause: err instanceof Error ? err : undefined,
    });
  }
}
