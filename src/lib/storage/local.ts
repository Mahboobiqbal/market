import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeKey, type StorageProvider } from "./types";

/**
 * Local disk driver. Files are written under UPLOAD_DIR, which defaults to
 * `public/uploads` so Next.js serves them at `/uploads/<key>`.
 *
 * Suitable for development and single-server self-hosting. For serverless or
 * multi-instance deployments, use an object-storage driver (S3-compatible,
 * planned for a later phase).
 */
export const localProvider: StorageProvider = {
  id: "local",

  async put({ key, data }) {
    const safeKey = assertSafeKey(key);
    const filePath = path.join(uploadsRoot(), safeKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return { key: safeKey, url: this.publicUrl(safeKey) };
  },

  async delete(key) {
    const safeKey = assertSafeKey(key);
    await rm(path.join(uploadsRoot(), safeKey), { force: true });
  },

  publicUrl(key) {
    return `/uploads/${assertSafeKey(key)}`;
  },
};

function uploadsRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
}
