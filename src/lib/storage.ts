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

function appDir(applicationId: string) {
  return path.join(process.cwd(), ROOT, applicationId);
}

export async function saveFile(applicationId: string, storedName: string, data: Buffer) {
  const dir = appDir(applicationId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, storedName), data);
}

export async function readFile(applicationId: string, storedName: string): Promise<Buffer> {
  return fs.readFile(path.join(appDir(applicationId), storedName));
}

export async function deleteFile(applicationId: string, storedName: string) {
  try {
    await fs.unlink(path.join(appDir(applicationId), storedName));
  } catch {
    // ignore missing file
  }
}

// Remove every uploaded file for an application (its whole folder). Used when an
// application is withdrawn or deleted — its documents are no longer needed.
export async function deleteAppFiles(applicationId: string) {
  try {
    await fs.rm(appDir(applicationId), { recursive: true, force: true });
  } catch {
    // ignore missing directory
  }
}
