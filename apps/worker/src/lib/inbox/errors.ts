export type InboxAuthErrorCode =
  | "token_expired"
  | "token_invalid"
  | "refresh_token_expired"
  | "refresh_token_invalid"
  | "unauthorized"
  | "forbidden"
  | "consent_required"
  | "mfa_required";

export type InboxSyncErrorCode =
  | "fetch_failed"
  | "rate_limited"
  | "network_error"
  | "provider_error";

export type InboxProvider = "gmail";

interface InboxAuthErrorOptions {
  code: InboxAuthErrorCode;
  provider: InboxProvider;
  message: string;
  requiresReauth: boolean;
  cause?: Error;
}

export class InboxAuthError extends Error {
  readonly code: InboxAuthErrorCode;
  readonly provider: InboxProvider;
  readonly requiresReauth: boolean;

  constructor(options: InboxAuthErrorOptions) {
    super(options.message);
    this.name = "InboxAuthError";
    this.code = options.code;
    this.provider = options.provider;
    this.requiresReauth = options.requiresReauth;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, InboxAuthError.prototype);
  }

  isReauthRequired(): boolean {
    return this.requiresReauth;
  }
}

interface InboxSyncErrorOptions {
  code: InboxSyncErrorCode;
  provider: InboxProvider;
  message: string;
  cause?: Error;
}

export class InboxSyncError extends Error {
  readonly code: InboxSyncErrorCode;
  readonly provider: InboxProvider;

  constructor(options: InboxSyncErrorOptions) {
    super(options.message);
    this.name = "InboxSyncError";
    this.code = options.code;
    this.provider = options.provider;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, InboxSyncError.prototype);
  }

  // Only network errors and rate limits are worth a retry-once; anything
  // else is either an auth problem or a permanent provider error.
  isRetryable(): boolean {
    return this.code === "network_error" || this.code === "rate_limited";
  }
}

export function isInboxAuthError(error: unknown): error is InboxAuthError {
  return error instanceof InboxAuthError;
}

export function isInboxSyncError(error: unknown): error is InboxSyncError {
  return error instanceof InboxSyncError;
}
