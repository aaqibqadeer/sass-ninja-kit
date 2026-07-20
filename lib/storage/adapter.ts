/**
 * lib/storage/adapter.ts — the StorageAdapter interface (Phase 6).
 *
 * Same interface+adapter shape as the db/payments layers (§1.2): app code
 * imports only this interface (via `@/lib/storage`), never a provider SDK. The
 * concrete implementation lives in ./s3; the provider is selected once in
 * ./index.ts. Uploads use presigned URLs so file bytes go client→provider
 * directly, never through the app server.
 */

export interface StorageAdapter {
  /** A presigned URL the client PUTs the file bytes to. */
  getUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string }>;
  /** A short-lived presigned URL to read/download an object. */
  getDownloadUrl(key: string): Promise<{ url: string }>;
  /** Delete an object. */
  deleteObject(key: string): Promise<void>;
}
