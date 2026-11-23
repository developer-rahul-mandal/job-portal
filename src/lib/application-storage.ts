import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  RESUME_STORAGE_DIR,
  getResumeFilePath,
  isSafeResumeStorageKey,
} from "./resume-storage";

export const APP_RESUME_STORAGE_DIR = path.resolve(
  process.env.APP_RESUME_STORAGE_PATH || "./private/application-resumes"
);

const APP_STORAGE_KEY_PATTERN =
  /^app-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx)$/i;

export function isSafeApplicationResumeKey(key: string): boolean {
  return APP_STORAGE_KEY_PATTERN.test(key) || isSafeResumeStorageKey(key);
}

export function getApplicationResumeFilePath(key: string): string {
  if (!isSafeApplicationResumeKey(key)) {
    throw new Error("Invalid application resume storage key");
  }

  // If key starts with "app-", it's in APP_RESUME_STORAGE_DIR, else fallback to RESUME_STORAGE_DIR
  if (key.startsWith("app-")) {
    return path.join(APP_RESUME_STORAGE_DIR, key);
  }
  return path.join(RESUME_STORAGE_DIR, key);
}

export async function ensureApplicationResumeStorageDirectory() {
  await mkdir(APP_RESUME_STORAGE_DIR, { recursive: true });
}

/**
 * Creates an immutable snapshot copy of an applicant's resume for a specific job application.
 * This guarantees that even if the applicant subsequently renames, updates, or deletes
 * their profile resume, the employer and candidate can always access the exact submitted version.
 */
export async function preserveResumeForApplication(
  sourceStorageKey: string
): Promise<string> {
  if (!isSafeResumeStorageKey(sourceStorageKey)) {
    throw new Error("Invalid source resume storage key");
  }

  const sourcePath = getResumeFilePath(sourceStorageKey);

  // Verify source file exists
  await stat(sourcePath);

  await ensureApplicationResumeStorageDirectory();

  const ext = path.extname(sourceStorageKey).toLowerCase();
  const targetKey = `app-${randomUUID()}${ext}`;
  const targetPath = path.join(APP_RESUME_STORAGE_DIR, targetKey);

  await copyFile(sourcePath, targetPath);

  return targetKey;
}

export async function deleteApplicationResume(key: string): Promise<void> {
  if (!key || !isSafeApplicationResumeKey(key)) return;
  try {
    const filePath = getApplicationResumeFilePath(key);
    await unlink(filePath);
  } catch (err) {
    // Silently ignore if file doesn't exist or already removed
  }
}

export async function readApplicationResumeFromDisk(key: string): Promise<Buffer> {
  const filePath = getApplicationResumeFilePath(key);
  return readFile(filePath);
}
