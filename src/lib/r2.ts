import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-compatible) storage helpers.
 *
 * The bucket is PRIVATE: nothing here returns a public URL. All access goes
 * through the app's auth-checked API routes, which stream bytes via these
 * signed server-side requests. Configure with:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 */

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

export const r2Configured = !!(accountId && accessKeyId && secretAccessKey && bucket);

const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";

let client: AwsClient | null = null;
function getClient(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      region: "auto",
      service: "s3",
    });
  }
  return client;
}

function objectUrl(key: string): string {
  return `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function r2Put(key: string, data: Buffer, contentType?: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), {
    method: "PUT",
    body: data,
    headers: contentType ? { "Content-Type": contentType } : {},
  });
  if (!res.ok) throw new Error(`R2 put failed (${res.status}): ${await res.text().catch(() => "")}`);
}

export async function r2Get(key: string): Promise<Buffer> {
  const res = await getClient().fetch(objectUrl(key), { method: "GET" });
  if (!res.ok) throw new Error(`R2 get failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function r2Delete(key: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), { method: "DELETE" });
  // R2 returns 204 on success; treat 404 as already-gone.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed (${res.status})`);
  }
}

/** List object keys under a prefix (handles pagination). */
export async function r2List(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (token) params.set("continuation-token", token);
    const res = await getClient().fetch(`${endpoint}/${bucket}?${params.toString()}`, { method: "GET" });
    if (!res.ok) throw new Error(`R2 list failed (${res.status})`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(decodeXml(m[1]));
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    token = truncated && next ? decodeXml(next[1]) : undefined;
  } while (token);
  return keys;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
