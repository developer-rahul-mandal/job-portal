import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import {
  detectAndValidateImageFormat,
  getImageMimeType,
  SupportedImageFormat,
} from "./profile-picture-storage";

export const LOGO_MAX_SIZE_BYTES = Number.parseInt(
  process.env.LOGO_MAX_SIZE_BYTES || String(5 * 1024 * 1024),
  10
);

export const LOGO_STORAGE_DIR = path.resolve(
  process.cwd(),
  process.env.LOGO_STORAGE_PATH || "private/company-logos"
);

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export function isSafeLogoKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

export function getLogoFilePath(key: string): string {
  if (!isSafeLogoKey(key)) {
    throw new Error("Invalid logo storage key");
  }
  return path.join(LOGO_STORAGE_DIR, key);
}

export async function ensureLogoStorageDirectory() {
  await mkdir(LOGO_STORAGE_DIR, { recursive: true });
}

export async function writeLogoToDisk(
  buffer: Buffer,
  format: SupportedImageFormat
): Promise<string> {
  await ensureLogoStorageDirectory();
  const key = `${randomUUID()}.${format}`;
  const targetPath = getLogoFilePath(key);
  await writeFile(targetPath, buffer);
  return key;
}

export async function readLogoFromDisk(key: string): Promise<Buffer> {
  const filePath = getLogoFilePath(key);
  return await readFile(filePath);
}

export async function deleteLogoFromDisk(key: string): Promise<boolean> {
  try {
    if (!isSafeLogoKey(key)) return false;
    const filePath = getLogoFilePath(key);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export { detectAndValidateImageFormat, getImageMimeType };
