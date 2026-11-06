import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError } from "@/lib/permissions";
import { storage } from "@/adapters/storage";
import { scan } from "@/adapters/scanner";

/**
 * Uploads (FR-M4-04, FR-M9-02, FR-M10-02): type and size limits, virus scan, photos
 * resized server-side and stored as WebP. Files are served only via signed URLs.
 */
export type Purpose = "space_photo" | "property_photo" | "logo" | "avatar" | "proposal" | "message_attachment";

const MB = 1024 * 1024;
const RULES: Record<Purpose, { mimes: string[]; maxBytes: number; image: boolean }> = {
  space_photo: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * MB, image: true },
  property_photo: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * MB, image: true },
  logo: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * MB, image: true },
  avatar: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * MB, image: true },
  proposal: { mimes: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 10 * MB, image: false },
  message_attachment: {
    mimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxBytes: 10 * MB,
    image: false,
  },
};

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Content sniffing so a renamed file can't pass as another type. */
function sniff(buf: Buffer, filename: string): string | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const ext = filename.toLowerCase().split(".").pop() ?? "";
    return ext === "docx" || ext === "xlsx" ? EXT_MIME[ext]! : null;
  }
  return null;
}

export type StoredFile = { id: string; filename: string; mime: string; size: number };

export async function storeUpload(
  userId: string,
  purpose: Purpose,
  file: { name: string; bytes: Buffer },
): Promise<StoredFile> {
  const rule = RULES[purpose];
  if (file.bytes.length === 0) throw new AppError("files.empty");
  if (file.bytes.length > rule.maxBytes) throw new AppError("files.tooLarge", { name: file.name, mb: rule.maxBytes / MB });
  const mime = sniff(file.bytes, file.name);
  if (!mime || !rule.mimes.includes(mime)) throw new AppError("files.typeNotAllowed", { name: file.name });
  const result = await scan(file.bytes);
  if (result !== "clean") throw new AppError(result === "infected" ? "files.infected" : "files.scanFailed", { name: file.name });

  let body = file.bytes;
  let storedMime = mime;
  let filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
  if (rule.image) {
    body = await sharp(file.bytes).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    storedMime = "image/webp";
    filename = filename.replace(/\.[^.]+$/, "") + ".webp";
  }
  const id = randomUUID();
  const key = `${purpose}/${id.slice(0, 2)}/${id}`;
  await storage().put(key, body, storedMime);
  await db()`
    insert into files (id, storage_key, filename, mime, size_bytes, purpose, scan_status, uploaded_by, created_at)
    values (${id}, ${key}, ${filename}, ${storedMime}, ${body.length}, ${purpose}, 'clean', ${userId}, ${await now()})`;
  return { id, filename, mime: storedMime, size: body.length };
}

export async function formFiles(form: FormData, field: string): Promise<{ name: string; bytes: Buffer }[]> {
  const out: { name: string; bytes: Buffer }[] = [];
  for (const v of form.getAll(field)) {
    if (typeof v === "object" && v && "arrayBuffer" in v && (v as File).size > 0) {
      out.push({ name: (v as File).name, bytes: Buffer.from(await (v as File).arrayBuffer()) });
    }
  }
  return out;
}
