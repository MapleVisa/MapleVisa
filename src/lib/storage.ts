import "server-only";
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.env.UPLOAD_DIR || "./uploads";

export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024;

export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Use Vercel Blob when a token is configured (production on Vercel); otherwise
// fall back to local disk so `npm run dev` works with zero setup.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function appDir(applicationId: string) {
  return path.join(process.cwd(), ROOT, applicationId);
}

function isUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://");
}

/**
 * Persist an uploaded file. Returns the value to store as the document's
 * `storedName`: a Blob URL in production, or the local filename in dev.
 */
export async function saveFile(
  applicationId: string,
  storedName: string,
  data: Buffer,
  mimeType?: string
): Promise<string> {
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`${applicationId}/${storedName}`, data, {
      access: "public",
      contentType: mimeType,
    });
    return url;
  }
  const dir = appDir(applicationId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, storedName), data);
  return storedName;
}

export async function readFile(applicationId: string, storedName: string): Promise<Buffer> {
  if (isUrl(storedName)) {
    const res = await fetch(storedName);
    if (!res.ok) throw new Error("Blob fetch failed");
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(appDir(applicationId), storedName));
}

export async function deleteFile(_applicationId: string, storedName: string) {
  try {
    if (isUrl(storedName)) {
      const { del } = await import("@vercel/blob");
      await del(storedName);
    } else {
      await fs.unlink(path.join(appDir(_applicationId), storedName));
    }
  } catch {
    // ignore missing file
  }
}

// Remove every uploaded file for an application. Used when an application is
// withdrawn or deleted — its documents are no longer needed.
export async function deleteAppFiles(applicationId: string) {
  try {
    if (useBlob) {
      const { list, del } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: `${applicationId}/` });
      if (blobs.length) await del(blobs.map((b) => b.url));
    } else {
      await fs.rm(appDir(applicationId), { recursive: true, force: true });
    }
  } catch {
    // ignore missing directory
  }
}
