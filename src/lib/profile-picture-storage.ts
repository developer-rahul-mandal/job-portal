import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

export const AVATAR_MAX_SIZE_BYTES = Number.parseInt(
  process.env.AVATAR_MAX_SIZE_BYTES || String(5 * 1024 * 1024),
  10
);

export const AVATAR_STORAGE_DIR = path.resolve(
  process.cwd(),
  process.env.AVATAR_STORAGE_PATH || "private/profile-pictures"
);

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export type SupportedImageFormat = "jpg" | "png" | "webp";

export function isSafeAvatarKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

export function getAvatarFilePath(key: string): string {
  if (!isSafeAvatarKey(key)) {
    throw new Error("Invalid avatar storage key");
  }
  return path.join(AVATAR_STORAGE_DIR, key);
}

export async function ensureAvatarStorageDirectory() {
  await mkdir(AVATAR_STORAGE_DIR, { recursive: true });
}

/**
 * Validates image magic bytes (file signature)
 * Returns the detected extension or null if unsupported/invalid
 */
export function detectAndValidateImageFormat(buffer: Buffer): SupportedImageFormat | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: RIFF .... WEBP
  // 'RIFF' at 0..3 (0x52 0x49 0x46 0x46) and 'WEBP' at 8..11 (0x57 0x45 0x42 0x50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // Explicitly reject SVG or any other format
  return null;
}

export function getImageMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Writes image buffer to private storage with a unique key
 */
export async function writeAvatarToDisk(buffer: Buffer, format: SupportedImageFormat): Promise<string> {
  await ensureAvatarStorageDirectory();
  const key = `${randomUUID()}.${format}`;
  const targetPath = getAvatarFilePath(key);
  await writeFile(targetPath, buffer);
  return key;
}

/**
 * Reads avatar file buffer from private storage
 */
export async function readAvatarFromDisk(key: string): Promise<Buffer> {
  const filePath = getAvatarFilePath(key);
  return await readFile(filePath);
}

/**
 * Safely deletes an avatar file from private storage
 */
export async function deleteAvatarFromDisk(key: string): Promise<boolean> {
  try {
    if (!isSafeAvatarKey(key)) return false;
    const filePath = getAvatarFilePath(key);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
