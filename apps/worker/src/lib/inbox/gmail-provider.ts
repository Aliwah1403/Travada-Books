import { createHash } from "node:crypto";
import { OAuth2Client, type Credentials } from "google-auth-library";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { supabase } from "../supabase";
import { encrypt } from "../crypto";
import { InboxAuthError, InboxSyncError } from "./errors";
import type { Attachment, EmailAttachment, GetAttachmentsOptions, Tokens } from "./types";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface GoogleApiError extends Error {
  code?: number;
  response?: {
    status?: number;
    data?: {
      error?: string;
      error_description?: string;
    };
  };
}

function decodeBase64Url(base64Url: string): Buffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padLength), "base64");
}

function ensureFileExtension(fileName: string, mimeType: string): string {
  if (/\.[^.]+$/.test(fileName)) return fileName;
  const ext = mimeType === "application/pdf" ? ".pdf" : ".bin";
  return `${fileName}${ext}`;
}

export class GmailProvider {
  #oauth2Client: OAuth2Client;
  #gmail: gmail_v1.Gmail | null = null;
  #accountId: string | null = null;
  #expiryDate: number | null = null;

  // Single-flight lock so concurrent calls that both see an expiring token
  // don't each fire their own refresh request against Google.
  #refreshPromise: Promise<void> | null = null;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing required Gmail OAuth2 credentials: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set",
      );
    }

    this.#oauth2Client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  }

  setAccountId(accountId: string): void {
    this.#accountId = accountId;
  }

  setTokens(tokens: Tokens): void {
    if (!tokens.access_token) {
      throw new Error("Access token is required");
    }

    this.#expiryDate = tokens.expiry_date ?? null;

    const credentials: Credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };

    this.#oauth2Client.setCredentials(credentials);
    this.#gmail = gmail({ version: "v1", auth: this.#oauth2Client });
  }

  // Refresh 5 minutes before actual expiry to avoid a request straddling
  // the expiry boundary mid-flight.
  #isTokenExpiredOrExpiring(): boolean {
    if (!this.#expiryDate) return true;
    return Date.now() >= this.#expiryDate - TOKEN_EXPIRY_BUFFER_MS;
  }

  async #ensureValidAccessToken(): Promise<void> {
    const credentials = this.#oauth2Client.credentials;

    if (!credentials.access_token) {
      throw new InboxAuthError({
        code: "token_invalid",
        provider: "gmail",
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
    const credentials = this.#oauth2Client.credentials;

    if (!credentials.refresh_token) {
      throw new InboxAuthError({
        code: "refresh_token_invalid",
        provider: "gmail",
        message: "Refresh token is not available. Re-authentication required.",
        requiresReauth: true,
      });
    }

    try {
      const { credentials: newCredentials } = await this.#oauth2Client.refreshAccessToken();

      if (!newCredentials.access_token) {
        throw new InboxAuthError({
          code: "token_invalid",
          provider: "gmail",
          message: "Failed to refresh access token",
          requiresReauth: true,
        });
      }

      if (newCredentials.expiry_date) {
        this.#expiryDate = newCredentials.expiry_date;
      }

      if (this.#accountId) {
        await this.#persistTokensToDatabase(newCredentials);
      }

      console.log("Successfully refreshed Gmail access token", {
        accountId: this.#accountId,
        newExpiryDate: newCredentials.expiry_date
          ? new Date(newCredentials.expiry_date).toISOString()
          : "unknown",
      });
    } catch (error: unknown) {
      if (error instanceof InboxAuthError) {
        throw error;
      }

      const googleError = error as GoogleApiError;
      const statusCode = googleError.code ?? googleError.response?.status;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      console.error("Token refresh failed", {
        statusCode,
        errorMessage,
        accountId: this.#accountId,
      });

      if (statusCode === 400 || statusCode === 401 || errorMessage.includes("invalid_grant")) {
        throw new InboxAuthError({
          code: "refresh_token_expired",
          provider: "gmail",
          message: "Refresh token is invalid or expired. Re-authentication required.",
          requiresReauth: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (errorMessage.includes("invalid_request")) {
        throw new InboxAuthError({
          code: "token_invalid",
          provider: "gmail",
          message: "Invalid refresh token request. Check OAuth2 client configuration.",
          requiresReauth: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new InboxAuthError({
        code: "token_invalid",
        provider: "gmail",
        message: `Token refresh failed: ${errorMessage}`,
        requiresReauth: false,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async #persistTokensToDatabase(credentials: Credentials): Promise<void> {
    if (!this.#accountId) return;

    try {
      const patch: Record<string, unknown> = {};

      if (credentials.refresh_token) {
        patch.refresh_token = await encrypt(credentials.refresh_token);
      }

      if (credentials.access_token) {
        patch.access_token = await encrypt(credentials.access_token);
        if (credentials.expiry_date) {
          patch.expiry_date = new Date(credentials.expiry_date).toISOString();
        }
      }

      if (Object.keys(patch).length === 0) return;

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

  async getAttachments(options: GetAttachmentsOptions): Promise<Attachment[]> {
    if (!this.#gmail) {
      throw new Error("Gmail client not initialized. Set tokens first.");
    }

    await this.#ensureValidAccessToken();

    const { maxResults = 50, lastAccessed, fullSync = false } = options;

    let dateFilter: string;
    if (fullSync || !lastAccessed) {
      // Initial/manual sync, or an account with no lastAccessed yet: look
      // back 30 days to capture recent business documents.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = `after:${thirtyDaysAgo.toISOString().split("T")[0]}`;
    } else {
      // Subsequent syncs: from lastAccessed, minus a day since Gmail's
      // "after:" is exclusive of the given date.
      const lastAccessDate = new Date(lastAccessed);
      lastAccessDate.setDate(lastAccessDate.getDate() - 1);
      dateFilter = `after:${lastAccessDate.toISOString().split("T")[0]}`;
    }

    try {
      // -from:me excludes mail the account holder sent themselves.
      const query = `-from:me has:attachment filename:pdf ${dateFilter}`;

      const allMessages: gmail_v1.Schema$Message[] = [];
      let nextPageToken: string | undefined;
      const maxPagesToFetch = 3;
      let pagesFetched = 0;

      do {
        const listResponse = await this.#gmail.users.messages.list({
          userId: "me",
          maxResults: Math.min(maxResults, 50),
          q: query,
          pageToken: nextPageToken,
        });

        if (listResponse.data.messages) {
          allMessages.push(...listResponse.data.messages);
        }

        nextPageToken = listResponse.data.nextPageToken ?? undefined;
        pagesFetched++;
      } while (nextPageToken && allMessages.length < maxResults && pagesFetched < maxPagesToFetch);

      const messages = allMessages.slice(0, maxResults);

      if (messages.length === 0) {
        console.log("No emails found with PDF attachments matching the criteria.");
        return [];
      }

      const messageDetailsPromises = messages
        .map((m) => m.id)
        .filter((id): id is string => Boolean(id))
        .map((id) =>
          this.#gmail!.users.messages
            .get({ userId: "me", id, format: "full" })
            .then((res) => res.data)
            .catch((err: unknown) => {
              console.error(`Failed to fetch message ${id}:`, err instanceof Error ? err.message : err);
              return null;
            }),
        );

      const fetchedMessages = (await Promise.all(messageDetailsPromises)).filter(
        (msg): msg is gmail_v1.Schema$Message => msg !== null,
      );

      if (fetchedMessages.length === 0) {
        console.log("All filtered messages failed to fetch details.");
        return [];
      }

      const attachmentsArray = await Promise.all(
        fetchedMessages.map((message) => this.#processMessageToAttachments(message)),
      );

      return attachmentsArray.flat();
    } catch (error: unknown) {
      if (error instanceof InboxAuthError || error instanceof InboxSyncError) {
        throw error;
      }

      const googleError = error as GoogleApiError;
      const statusCode = googleError.code ?? googleError.response?.status;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      console.error("Gmail API error:", {
        statusCode,
        errorMessage,
        accountId: this.#accountId,
        timestamp: new Date().toISOString(),
      });

      if (statusCode === 401) {
        throw new InboxAuthError({
          code: "token_expired",
          provider: "gmail",
          message: "Access token is invalid or expired. Authentication required.",
          requiresReauth: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (statusCode === 403) {
        throw new InboxAuthError({
          code: "forbidden",
          provider: "gmail",
          message: "Insufficient permissions or quota exceeded.",
          requiresReauth: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (statusCode === 400 && errorMessage.includes("invalid_grant")) {
        throw new InboxAuthError({
          code: "refresh_token_expired",
          provider: "gmail",
          message: "Refresh token is invalid or expired. Re-authentication required.",
          requiresReauth: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (statusCode === 429) {
        throw new InboxSyncError({
          code: "rate_limited",
          provider: "gmail",
          message: "Gmail API rate limit exceeded. Please try again later.",
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new InboxSyncError({
        code: "fetch_failed",
        provider: "gmail",
        message: `Failed to fetch attachments: ${errorMessage}`,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async #processMessageToAttachments(message: gmail_v1.Schema$Message): Promise<Attachment[]> {
    if (!message.id || !message.payload?.parts) {
      console.warn(`Skipping message ${message.id} due to missing ID or parts.`);
      return [];
    }

    const fromHeader = message.payload?.headers?.find((h) => h.name === "From")?.value;
    let senderDomain: string | undefined;
    let senderEmail: string | undefined;

    if (fromHeader) {
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : fromHeader;
      senderEmail = email?.includes("@") ? email : undefined;
      const domain = email?.split("@")[1];

      if (domain) {
        const domainParts = domain.split(".");
        const partsCount = domainParts.length;
        senderDomain =
          partsCount >= 2 ? `${domainParts[partsCount - 2]}.${domainParts[partsCount - 1]}` : domain;
      }
    }

    try {
      const rawAttachments = await this.#fetchAttachments(message.id, message.payload.parts);

      return rawAttachments.map((att) => {
        const filename = ensureFileExtension(att.filename, att.mimeType);
        const referenceId = createHash("sha256").update(`${message.id}_${filename}`).digest("hex");

        return {
          id: referenceId,
          filename,
          mimeType: att.mimeType,
          size: att.size,
          data: decodeBase64Url(att.data),
          website: senderDomain,
          senderEmail,
          referenceId,
        };
      });
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to process attachments for message ${message.id}: ${messageText}`);
      return [];
    }
  }

  async #fetchAttachments(
    messageId: string,
    parts: gmail_v1.Schema$MessagePart[],
  ): Promise<EmailAttachment[]> {
    const attachments: EmailAttachment[] = [];
    let attachmentsCount = 0;
    const maxAttachments = 5;

    if (!this.#gmail) return attachments;

    for (const part of parts) {
      if (attachmentsCount >= maxAttachments) break;

      const mimeType = part.mimeType ?? "application/octet-stream";

      if (
        part.filename &&
        part.body?.attachmentId &&
        (mimeType === "application/pdf" || mimeType === "application/octet-stream")
      ) {
        try {
          const attachmentResponse = await this.#gmail.users.messages.attachments.get({
            userId: "me",
            messageId,
            id: part.body.attachmentId,
          });

          if (attachmentResponse.data.data) {
            attachments.push({
              filename: part.filename,
              mimeType,
              size: attachmentResponse.data.size ?? 0,
              data: attachmentResponse.data.data,
            });
            attachmentsCount++;
          }
        } catch (error: unknown) {
          const attachmentIdentifier = part.filename || `attachment with ID ${part.body.attachmentId}`;
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to fetch ${attachmentIdentifier} for message ${messageId}: ${message}`);
        }
      }

      if (part.parts) {
        const nestedAttachments = await this.#fetchAttachments(messageId, part.parts);
        attachments.push(...nestedAttachments);
        attachmentsCount = attachments.length;
        if (attachmentsCount >= maxAttachments) break;
      }
    }

    return attachments.slice(0, maxAttachments);
  }
}
