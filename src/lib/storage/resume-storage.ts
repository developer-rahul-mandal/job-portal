
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_DIR = path.resolve(
  process.env.RESUME_STORAGE_PATH || "./private/resumes"
);

export async function saveResume(
  buffer: Buffer,
  originalFileName: string
) {
  await mkdir(STORAGE_DIR, { recursive: true });

  const extension = path.extname(originalFileName).toLowerCase();

  const allowedExtensions = [".pdf", ".doc", ".docx"];

  if (!allowedExtensions.includes(extension)) {
    throw new Error("Unsupported resume file extension");
  }

  const storageKey = `${randomUUID()}${extension}`;
  const filePath = path.join(STORAGE_DIR, storageKey);

  await writeFile(filePath, buffer, { flag: "wx" });

  return {
    storageKey,
    fileName: path.basename(originalFileName),
    filePath,
  };
}

export async function deleteResume(storageKey: string) {
  // Only accept generated UUID-based storage keys.
  if (!/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(storageKey)) {
    throw new Error("Invalid storage key");
  }

  const filePath = path.join(STORAGE_DIR, storageKey);

  await unlink(filePath);
}
