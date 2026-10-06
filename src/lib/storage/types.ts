/**
 * Storage provider abstraction for product images, avatars, and documents.
 *
 * Keys are relative paths like "products/abc123.jpg". Keys must never escape
 * the storage root (no "..", no leading slash).
 */

export interface StoragePutInput {
  key: string;
  data: Uint8Array;
  contentType: string;
}

export interface StoragePutResult {
  key: string;
  url: string;
}

export interface StorageProvider {
  readonly id: "local" | "s3";
  put(input: StoragePutInput): Promise<StoragePutResult>;
  delete(key: string): Promise<void>;
  /** Publicly reachable URL for a stored key. */
  publicUrl(key: string): string;
}

export function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("~") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return normalized;
}
