export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64url-encoded, as returned by the Gmail API
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  referenceId: string;
  data: Buffer;
  website?: string;
  senderEmail?: string;
}

export interface Tokens {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export interface GetAttachmentsOptions {
  maxResults?: number;
  lastAccessed?: string;
  fullSync?: boolean;
}
