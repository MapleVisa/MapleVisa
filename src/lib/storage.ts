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

/**
 * Verify a file's real type by inspecting its leading bytes ("magic numbers")
 * instead of trusting the client-supplied MIME type, which is trivial to forge.
 * Returns the canonical MIME if the content matches an allowed type and is
 * consistent with `claimedMime`, otherwise null.
 */
export function sniffMime(buf: Buffer, claimedMime: string): string | null {
  let detected: string | null = null;
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    detected = "application/pdf"; // %PDF
  } else if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    detected = "image/jpeg"; // JPEG SOI
  } else if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    detected = "image/png"; // PNG signature
  }
  if (!detected || !ALLOWED_MIME[detected]) return null;
  // The real content must also match what the client claimed (jpg/jpeg alias ok).
  if (claimedMime !== detected && !(detected === "image/jpeg" && claimedMime === "image/jpg")) {
    return null;
  }
  return detected;
}

import { r2Configured, r2Put, r2Get, r2Delete, r2List } from "./r2";

// Storage backend selection (in priority order):
//   1. Cloudflare R2  — PRIVATE bucket, recommended for production.
//   2. Vercel Blob    — legacy/public; still readable for already-stored files.
//   3. Local disk     — zero-setup dev fallback.
const useBlob = !r2Configured && !!process.env.BLOB_READ_WRITE_TOKEN;

function appDir(applicationId: string) {
  return path.join(process.cwd(), ROOT, applicationId);
}

function isUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://");
}

/**
 * Persist an uploaded file. Returns the value to store as the document's
 * `storedName`: an R2 object key, a Blob URL, or a local filename depending on
 * the active backend. `readFile`/`deleteFile` interpret it accordingly.
 */
export async function saveFile(
  applicationId: string,
  storedName: string,
  data: Buffer,
  mimeType?: string
): Promise<string> {
  if (r2Configured) {
    const key = `${applicationId}/${storedName}`;
    await r2Put(key, data, mimeType);
    return key;
  }
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
  // Legacy Vercel Blob entries are stored as full URLs.
  if (isUrl(storedName)) {
    const res = await fetch(storedName);
    if (!res.ok) throw new Error("Blob fetch failed");
    return Buffer.from(await res.arrayBuffer());
  }
  if (r2Configured) {
    return r2Get(storedName);
  }
  return fs.readFile(path.join(appDir(applicationId), storedName));
}

export async function deleteFile(_applicationId: string, storedName: string) {
  try {
    if (isUrl(storedName)) {
      const { del } = await import("@vercel/blob");
      await del(storedName);
    } else if (r2Configured) {
      await r2Delete(storedName);
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
    if (r2Configured) {
      const keys = await r2List(`${applicationId}/`);
      await Promise.all(keys.map((k) => r2Delete(k)));
    } else if (useBlob) {
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
