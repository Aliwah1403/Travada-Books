import { createHash } from "node:crypto";
import { supabase } from "../supabase";
import { encrypt } from "../crypto";
import { InboxAuthError, InboxSyncError } from "./errors";
import type { Attachment, GetAttachmentsOptions, Tokens } from "./types";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const GRAPH_SCOPES =
  "offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read openid email";
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface GraphTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface GraphTokenErrorResponse {
  error?: string;
  error_description?: string;
}

interface GraphEmailAddress {
  name?: string;
  address?: string;
}

interface GraphMessage {
  id: string;
  subject?: string;
  from?: { emailAddress?: GraphEmailAddress };
  receivedDateTime?: string;
}

interface GraphMessagesListResponse {
  value: GraphMessage[];
}

interface GraphFileAttachment {
  "@odata.type": string;
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
  isInline?: boolean;
}

interface GraphAttachmentsListResponse {
  value: GraphFileAttachment[];
}

export class OutlookProvider {
  #clientId: string;
  #clientSecret: string;
  #accountId: string | null = null;
  #accessToken: string | null = null;
  #refreshToken: string | null = null;
  #expiryDate: number | null = null;

  // Single-flight lock so concurrent calls that both see an expiring token
  // don't each fire their own refresh request against Microsoft.
  #refreshPromise: Promise<void> | null = null;

  constructor() {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing required Outlook OAuth2 credentials: MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set",
      );
    }

    this.#clientId = clientId;
    this.#clientSecret = clientSecret;
  }

  setAccountId(accountId: string): void {
    this.#accountId = accountId;
  }

  setTokens(tokens: Tokens): void {
    if (!tokens.access_token) {
      throw new Error("Access token is required");
    }

    this.#accessToken = tokens.access_token;
    this.#refreshToken = tokens.refresh_token ?? null;
    this.#expiryDate = tokens.expiry_date ?? null;
  }

  // Refresh 5 minutes before actual expiry to avoid a request straddling
  // the expiry boundary mid-flight.
  #isTokenExpiredOrExpiring(): boolean {
    if (!this.#expiryDate) return true;
    return Date.now() >= this.#expiryDate - TOKEN_EXPIRY_BUFFER_MS;
  }

  async #ensureValidAccessToken(): Promise<void> {
    if (!this.#accessToken) {
      throw new InboxAuthError({
        code: "token_invalid",
        provider: "outlook",
        message: "No access token available. Authentication required.",
        requiresReauth: true,
      });
    }

    if (this.#isTokenExpiredOrExpiring()) {
      await this.#refreshTokensInternal();
    }
  }

  async #refreshTokensInternal(): Promise<void> {
    if (this.#refreshPromise) {
      return this.#refreshPromise;
    }

    this.#refreshPromise = this.#doRefreshTokens();

    try {
      await this.#refreshPromise;
    } finally {
      this.#refreshPromise = null;
    }
  }

  async #doRefreshTokens(): Promise<void> {
    if (!this.#refreshToken) {
      throw new InboxAuthError({
        code: "refresh_token_invalid",
        provider: "outlook",
        message: "Refresh token is not available. Re-authentication required.",
        requiresReauth: true,
      });
    }

    let response: Response;
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.#clientId,
          client_secret: this.#clientSecret,
          refresh_token: this.#refreshToken,
          grant_type: "refresh_token",
          scope: GRAPH_SCOPES,
        }),
      });
    } catch (error: unknown) {
      throw new InboxAuthError({
        code: "token_invalid",
        provider: "outlook",
        message: `Token refresh request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        requiresReauth: false,
        cause: error instanceof Error ? error : undefined,
      });
    }

    if (!response.ok) {
      let body: GraphTokenErrorResponse = {};
      try {
        body = (await response.json()) as GraphTokenErrorResponse;
      } catch {
        // ignore — fall back to status-code-only handling below
      }

      console.error("Outlook token refresh failed", {
        status: response.status,
        error: body.error,
        accountId: this.#accountId,
      });

      if (response.status === 400 && body.error === "invalid_grant") {
        throw new InboxAuthError({
          code: "refresh_token_expired",
          provider: "outlook",
          message: "Refresh token is invalid or expired. Re-authentication required.",
          requiresReauth: true,
        });
      }

      if (response.status === 401) {
        throw new InboxAuthError({
          code: "token_expired",
          provider: "outlook",
          message: "Access token is invalid or expired. Authentication required.",
          requiresReauth: true,
        });
      }

      throw new InboxAuthError({
        code: "token_invalid",
        provider: "outlook",
        message: `Token refresh failed: ${body.error_description ?? body.error ?? response.statusText}`,
        requiresReauth: false,
      });
    }

    const newTokens = (await response.json()) as GraphTokenResponse;

    if (!newTokens.access_token) {
      throw new InboxAuthError({
        code: "token_invalid",
        provider: "outlook",
        message: "Failed to refresh access token",
        requiresReauth: true,
      });
    }

    this.#accessToken = newTokens.access_token;
    this.#expiryDate = Date.now() + newTokens.expires_in * 1000;

    // Microsoft rotates refresh tokens on every use — persist the new one
    // whenever it comes back, don't assume the old one is still valid.
    if (newTokens.refresh_token) {
      this.#refreshToken = newTokens.refresh_token;
    }

    if (this.#accountId) {
      await this.#persistTokensToDatabase(newTokens);
    }

    console.log("Successfully refreshed Outlook access token", {
      accountId: this.#accountId,
      newExpiryDate: new Date(this.#expiryDate).toISOString(),
    });
  }

  async #persistTokensToDatabase(tokens: GraphTokenResponse): Promise<void> {
    if (!this.#accountId) return;

    try {
      const patch: Record<string, unknown> = {
        access_token: await encrypt(tokens.access_token),
        expiry_date: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      };

      if (tokens.refresh_token) {
        patch.refresh_token = await encrypt(tokens.refresh_token);
      }

      const { error } = await supabase.from("inbox_accounts").update(patch).eq("id", this.#accountId);
      if (error) throw error;
    } catch (error) {
      console.error("Failed to persist tokens to database:", error);
      // Don't throw — the refresh itself succeeded, we just failed to persist.
    }
  }

  async refreshTokens(): Promise<void> {
    if (!this.#accountId) {
      throw new Error("Account ID is required for token refresh");
    }

    await this.#refreshTokensInternal();
  }

  async #graphFetch(path: string): Promise<Response> {
    if (!this.#accessToken) {
      throw new Error("Outlook client not initialized. Set tokens first.");
    }

    let response: Response;
    try {
      response = await fetch(`${GRAPH_BASE}${path}`, {
        headers: { Authorization: `Bearer ${this.#accessToken}` },
      });
    } catch (error: unknown) {
      throw new InboxSyncError({
        code: "fetch_failed",
        provider: "outlook",
        message: `Failed to fetch from Microsoft Graph: ${error instanceof Error ? error.message : "Unknown error"}`,
        cause: error instanceof Error ? error : undefined,
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

      console.error("Microsoft Graph API error:", {
        status: response.status,
        errorText,
        accountId: this.#accountId,
        timestamp: new Date().toISOString(),
      });

      if (response.status === 401) {
        throw new InboxAuthError({
          code: "token_expired",
          provider: "outlook",
          message: "Access token is invalid or expired. Authentication required.",
          requiresReauth: true,
        });
      }

      if (response.status === 403) {
        throw new InboxAuthError({
          code: "forbidden",
          provider: "outlook",
          message: "Insufficient permissions or quota exceeded.",
          requiresReauth: true,
        });
      }

      if (response.status === 429) {
        throw new InboxSyncError({
          code: "rate_limited",
          provider: "outlook",
          message: "Microsoft Graph API rate limit exceeded. Please try again later.",
        });
      }

      throw new InboxSyncError({
        code: "fetch_failed",
        provider: "outlook",
        message: `Failed to fetch attachments: ${errorText || response.statusText}`,
      });
    }

    return response;
  }

  async getAttachments(options: GetAttachmentsOptions): Promise<Attachment[]> {
    await this.#ensureValidAccessToken();

    const { maxResults = 50, lastAccessed, fullSync = false } = options;
    const cappedMaxResults = Math.min(maxResults, 50);

    let dateFloor: Date;
    if (fullSync || !lastAccessed) {
      // Initial/manual sync, or an account with no lastAccessed yet: look
      // back 30 days to capture recent business documents.
      dateFloor = new Date();
      dateFloor.setDate(dateFloor.getDate() - 30);
    } else {
      // Subsequent syncs: from lastAccessed, minus a day for symmetry with
      // Gmail's "after:" being exclusive of the given date.
      dateFloor = new Date(lastAccessed);
      dateFloor.setDate(dateFloor.getDate() - 1);
    }

    try {
      const filter = `hasAttachments eq true and receivedDateTime ge ${dateFloor.toISOString()}`;
      const params = new URLSearchParams({
        $filter: filter,
        $select: "id,subject,from,receivedDateTime",
        $top: String(cappedMaxResults),
        $orderby: "receivedDateTime desc",
      });

      const listResponse = await this.#graphFetch(`/me/messages?${params.toString()}`);
      const { value: messages } = (await listResponse.json()) as GraphMessagesListResponse;

      if (!messages || messages.length === 0) {
        console.log("No emails found with attachments matching the criteria.");
        return [];
      }

      const attachmentsArray = await Promise.all(
        messages.map((message) => this.#processMessageToAttachments(message)),
      );

      return attachmentsArray.flat();
    } catch (error: unknown) {
      if (error instanceof InboxAuthError || error instanceof InboxSyncError) {
        throw error;
      }

      throw new InboxSyncError({
        code: "fetch_failed",
        provider: "outlook",
        message: `Failed to fetch attachments: ${error instanceof Error ? error.message : "Unknown error"}`,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async #processMessageToAttachments(message: GraphMessage): Promise<Attachment[]> {
    const senderEmail = message.from?.emailAddress?.address ?? undefined;
    let senderDomain: string | undefined;

    if (senderEmail?.includes("@")) {
      const domain = senderEmail.split("@")[1];
      if (domain) {
        const domainParts = domain.split(".");
        const partsCount = domainParts.length;
        senderDomain =
          partsCount >= 2 ? `${domainParts[partsCount - 2]}.${domainParts[partsCount - 1]}` : domain;
      }
    }

    try {
      const attachmentsResponse = await this.#graphFetch(`/me/messages/${message.id}/attachments`);
      const { value: rawAttachments } = (await attachmentsResponse.json()) as GraphAttachmentsListResponse;

      const pdfAttachments = rawAttachments
        .filter(
          (att) =>
            att["@odata.type"] === "#microsoft.graph.fileAttachment" &&
            att.contentType === "application/pdf" &&
            !!att.contentBytes,
        )
        .slice(0, 5);

      return pdfAttachments.map((att) => {
        const referenceId = createHash("sha256").update(`${message.id}_${att.name}`).digest("hex");

        return {
          id: referenceId,
          filename: att.name,
          mimeType: att.contentType,
          size: att.size,
          data: Buffer.from(att.contentBytes!, "base64"),
          website: senderDomain,
          senderEmail,
          referenceId,
        };
      });
    } catch (error: unknown) {
      if (error instanceof InboxAuthError || error instanceof InboxSyncError) {
        throw error;
      }

      const messageText = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to process attachments for message ${message.id}: ${messageText}`);
      return [];
    }
  }
}
