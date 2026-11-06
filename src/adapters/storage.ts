import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";
import { hmac, safeEqual } from "@/lib/tokens";

/**
 * File storage adapter (PRD §10): local disk in dev/test, S3-compatible object storage
 * in the hosted environments. Files are always served through signed, expiring URLs.
 */
export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements StorageAdapter {
  constructor(private readonly root: string) {}
  private p(key: string) {
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(path.resolve(this.root))) throw new Error("bad key");
    return resolved;
  }
  async put(key: string, body: Buffer) {
    await mkdir(path.dirname(this.p(key)), { recursive: true });
    await writeFile(this.p(key), body);
  }
  async get(key: string) {
    return readFile(this.p(key));
  }
  async remove(key: string) {
    await rm(this.p(key), { force: true });
  }
}

/** S3 adapter over the S3 REST API with SigV4, so no SDK is needed. */
class S3Storage implements StorageAdapter {
  async put(key: string, body: Buffer, contentType: string) {
    const res = await this.request("PUT", key, body, contentType);
    if (!res.ok) throw new Error(`S3 put failed: ${res.status}`);
  }
  async get(key: string) {
    const res = await this.request("GET", key);
    if (!res.ok) throw new Error(`S3 get failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  async remove(key: string) {
    await this.request("DELETE", key);
  }
  private async request(method: string, key: string, body?: Buffer, contentType?: string) {
    const { createHash, createHmac } = await import("node:crypto");
    const env = process.env;
    const endpoint = new URL(env.S3_ENDPOINT ?? "");
    const region = env.S3_REGION ?? "auto";
    const url = new URL(`/${env.S3_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`, endpoint);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = amzDate.slice(0, 8);
    const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const headers: Record<string, string> = { host: url.host, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash };
    if (contentType) headers["content-type"] = contentType;
    const signed = Object.keys(headers).sort();
    const canonical = [method, url.pathname, "", ...signed.map((h) => `${h}:${headers[h]}`), "", signed.join(";"), payloadHash].join("\n");
    const scope = `${date}/${region}/s3/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
    const k = (key: Buffer | string, d: string) => createHmac("sha256", key).update(d).digest();
    const signingKey = k(k(k(k(`AWS4${env.S3_SECRET_KEY}`, date), region), "s3"), "aws4_request");
    const signature = createHmac("sha256", signingKey).update(toSign).digest("hex");
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${signature}`;
    return fetch(url, { method, headers, body: body ? new Uint8Array(body) : undefined });
  }
}

let adapter: StorageAdapter | undefined;
export function storage(): StorageAdapter {
  adapter ??= config().STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage(config().STORAGE_LOCAL_DIR);
  return adapter;
}

/** Signed, expiring URL for a stored file (NFR security). */
export function signedFileUrl(fileId: string, ttlSeconds = 3600, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  return `/api/files/${fileId}?exp=${exp}&sig=${hmac(`${fileId}.${exp}`)}`;
}

export function verifyFileSignature(fileId: string, exp: string, sig: string, nowMs = Date.now()): boolean {
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < nowMs) return false;
  return safeEqual(hmac(`${fileId}.${exp}`), sig);
}
