import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";

/**
 * File storage for user uploads.
 *
 * - DISK: self-hosted / Docker deployments with a persistent UPLOAD_DIR volume.
 * - DB:   serverless (Vercel has no persistent disk) — bytes live in a side table.
 *
 * Files are always addressed by record id, never by the client's filename.
 */
export type StorageKind = "DB" | "DISK";

export function storageKind(): StorageKind {
  return process.env.VERCEL || !process.env.UPLOAD_DIR ? "DB" : "DISK";
}

/** Vercel rejects request bodies over 4.5 MB, so cap below that there. */
export function maxUploadBytes() {
  const configured = Number(process.env.MAX_FILE_SIZE_MB) || 10;
  const mb = process.env.VERCEL ? Math.min(configured, 4) : configured;
  return mb * 1024 * 1024;
}

function diskPath(companyId: string, id: string) {
  const root = path.resolve(process.env.UPLOAD_DIR ?? "./uploads", "data-center");
  const full = path.resolve(root, companyId, id);
  // ids are cuids, but never let a crafted value escape the upload root.
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export async function saveUploadContent(kind: StorageKind, companyId: string, id: string, bytes: Buffer) {
  if (kind === "DISK") {
    const file = diskPath(companyId, id);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  } else {
    await db.dataUploadBlob.create({ data: { uploadId: id, content: new Uint8Array(bytes) } });
  }
}

export async function readUploadContent(kind: string, companyId: string, id: string): Promise<Buffer | null> {
  if (kind === "DISK") {
    try {
      return await fs.readFile(diskPath(companyId, id));
    } catch {
      return null;
    }
  }
  const blob = await db.dataUploadBlob.findUnique({ where: { uploadId: id } });
  return blob ? Buffer.from(blob.content) : null;
}

/** Best-effort cleanup when a save fails half-way. */
export async function removeUploadContent(kind: StorageKind, companyId: string, id: string) {
  try {
    if (kind === "DISK") await fs.unlink(diskPath(companyId, id));
    else await db.dataUploadBlob.delete({ where: { uploadId: id } });
  } catch {
    /* already gone */
  }
}
