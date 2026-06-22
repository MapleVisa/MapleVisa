import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Generic S3-compatible object storage (private bucket).
 *
 * Works with any S3 API: Supabase Storage, Cloudflare R2, Backblaze B2, AWS S3,
 * MinIO, etc. Nothing here returns a public URL — all access goes through the
 * app's auth-checked routes, which stream bytes via these signed requests.
 *
 * Configure with:
 *   S3_ENDPOINT          e.g. https://<ref>.supabase.co/storage/v1/s3
 *   S3_REGION            e.g. us-east-1  (use "auto" for R2)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET
 *
 * Cloudflare R2 shorthand (auto-builds the endpoint) is also accepted:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 */

const r2Account = process.env.R2_ACCOUNT_ID;

const endpoint = (
  process.env.S3_ENDPOINT ||
  (r2Account ? `https://${r2Account}.r2.cloudflarestorage.com` : "")
).replace(/\/+$/, "");
const region = process.env.S3_REGION || (r2Account ? "auto" : "us-east-1");
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET;

export const s3Configured = !!(endpoint && accessKeyId && secretAccessKey && bucket);

let client: AwsClient | null = null;
function getClient(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      region,
      service: "s3",
    });
  }
  return client;
}

// Path-style URL (works across providers, incl. Supabase/MinIO).
function objectUrl(key: string): string {
  return `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function s3Put(key: string, data: Buffer, contentType?: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), {
    method: "PUT",
    body: data,
    headers: contentType ? { "Content-Type": contentType } : {},
  });
  if (!res.ok) throw new Error(`S3 put failed (${res.status}): ${await res.text().catch(() => "")}`);
}

export async function s3Get(key: string): Promise<Buffer> {
  const res = await getClient().fetch(objectUrl(key), { method: "GET" });
  if (!res.ok) throw new Error(`S3 get failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function s3Delete(key: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`S3 delete failed (${res.status})`);
}

/** List object keys under a prefix (handles pagination). */
export async function s3List(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (token) params.set("continuation-token", token);
    const res = await getClient().fetch(`${endpoint}/${bucket}?${params.toString()}`, { method: "GET" });
    if (!res.ok) throw new Error(`S3 list failed (${res.status})`);
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
