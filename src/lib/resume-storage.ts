
import { randomUUID } from "node:crypto";
import {
  mkdir,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";

export const RESUME_STORAGE_DIR = path.resolve(
  process.env.RESUME_STORAGE_PATH || "./private/resumes",
);

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx)$/i;

export function isSafeResumeStorageKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

export function getResumeFilePath(key: string): string {
  if (!isSafeResumeStorageKey(key)) {
    throw new Error("Invalid resume storage key");
  }

  return path.join(RESUME_STORAGE_DIR, key);
}

export async function ensureResumeStorageDirectory() {
  await mkdir(RESUME_STORAGE_DIR, { recursive: true });
}

function validateDocx(buffer: Buffer): boolean {
  if (buffer.length < 22) return false;

  const minimumOffset = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;

  for (
    let offset = buffer.length - 22;
    offset >= minimumOffset;
    offset--
  ) {
    if (buffer.readUInt32LE(offset) !== 0x06054b50) {
      continue;
    }

    const commentLength = buffer.readUInt16LE(offset + 20);

    if (offset + 22 + commentLength === buffer.length) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) return false;

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const directorySize = buffer.readUInt32LE(eocdOffset + 12);
  const directoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0 ||
    totalEntries === 0xffff ||
    directoryOffset + directorySize > eocdOffset
  ) {
    return false;
  }

  const required = new Set([
    "[Content_Types].xml",
    "word/document.xml",
  ]);

  let cursor = directoryOffset;
  const directoryEnd = directoryOffset + directorySize;

  for (let i = 0; i < totalEntries; i++) {
    if (
      cursor + 46 > directoryEnd ||
      buffer.readUInt32LE(cursor) !== 0x02014b50
    ) {
      return false;
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);

    if (flags & 0x0001) return false;

    const entryEnd =
      cursor + 46 + nameLength + extraLength + commentLength;

    if (entryEnd > directoryEnd) return false;

    const name = buffer
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString("utf8")
      .replace(/\\/g, "/");

    required.delete(name);
    cursor = entryEnd;
  }

  return cursor === directoryEnd && required.size === 0;
}

export function validateResumeFile(
  buffer: Buffer,
  extension: string,
): boolean {
  if (extension === ".pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (extension === ".doc") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([
        0xd0, 0xcf, 0x11, 0xe0,
        0xa1, 0xb1, 0x1a, 0xe1,
      ]),
    );
  }

  if (extension === ".docx") {
    return validateDocx(buffer);
  }

  return false;
}

export async function stageResumeFileDeletion(key: string) {
  const originalPath = getResumeFilePath(key);

  const stagedPath = path.join(
    RESUME_STORAGE_DIR,
    `${key}.deleting-${randomUUID()}`,
  );

  await rename(originalPath, stagedPath);

  let finalized = false;

  return {
    async restore() {
      if (finalized) return;

      await rename(stagedPath, originalPath);
      finalized = true;
    },

    async commit() {
      if (finalized) return;

      await unlink(stagedPath);
      finalized = true;
    },
  };
}
