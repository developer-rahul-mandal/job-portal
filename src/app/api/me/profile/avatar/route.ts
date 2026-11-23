import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  AVATAR_MAX_SIZE_BYTES,
  detectAndValidateImageFormat,
  getImageMimeType,
  isSafeAvatarKey,
  readAvatarFromDisk,
  writeAvatarToDisk,
  deleteAvatarFromDisk,
} from "@/lib/profile-picture-storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

// ======================================================
// GET /api/me/profile/avatar
// Streams the authenticated user's private profile picture
// ======================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { profileImage: true },
    });

    if (!profile?.profileImage || !isSafeAvatarKey(profile.profileImage)) {
      return errorResponse("No profile picture found.", 404);
    }

    const etag = `"${profile.profileImage}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    try {
      const buffer = await readAvatarFromDisk(profile.profileImage);
      const ext = profile.profileImage.split(".").pop() || "jpg";
      const mime = getImageMimeType(ext);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "private, no-cache, must-revalidate",
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return errorResponse("Profile picture file missing from storage.", 404);
    }
  } catch (err) {
    console.error("GET_AVATAR_ERROR:", err);
    return errorResponse("Failed to retrieve profile picture.", 500);
  }
}

// ======================================================
// POST /api/me/profile/avatar
// Uploads and safely updates the authenticated applicant's profile picture
// ======================================================
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const formData = await request.formData();
    const file = formData.get("avatar") || formData.get("file");

    if (!file || !(file instanceof File)) {
      return errorResponse("No image file provided in 'avatar' field.", 400);
    }

    if (file.size === 0) {
      return errorResponse("Uploaded image file is empty.", 400);
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      const maxMb = Math.round(AVATAR_MAX_SIZE_BYTES / (1024 * 1024));
      return errorResponse(`File size exceeds maximum allowed limit of ${maxMb}MB.`, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate actual file signature/magic bytes (rejects SVG, HTML, executables, etc.)
    const detectedFormat = detectAndValidateImageFormat(buffer);

    if (!detectedFormat) {
      return errorResponse(
        "Unsupported image format. Only JPEG, PNG, and WebP are allowed. SVG and other formats are strictly rejected.",
        400
      );
    }

    // Lookup current profile to obtain previous image key
    const currentProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { profileImage: true },
    });

    const oldKey = currentProfile?.profileImage;

    // 1. Store the new image under unique filename
    const newKey = await writeAvatarToDisk(buffer, detectedFormat);

    // 2. Safely update database reference
    try {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          profileImage: newKey,
        },
        update: {
          profileImage: newKey,
        },
      });
    } catch (dbError) {
      // If database update fails, immediately remove the newly uploaded orphaned file
      // and keep the previous image intact
      await deleteAvatarFromDisk(newKey);
      console.error("DB_AVATAR_UPDATE_FAILED:", dbError);
      return errorResponse("Database error while updating avatar reference.", 500);
    }

    // 3. Confirming database update succeeded, safely delete previous image if one existed
    if (oldKey && isSafeAvatarKey(oldKey) && oldKey !== newKey) {
      await deleteAvatarFromDisk(oldKey);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile picture uploaded and updated successfully.",
        data: {
          avatarUrl: "/api/me/profile/avatar",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST_AVATAR_ERROR:", err);
    return errorResponse("Failed to upload profile picture.", 500);
  }
}

// ======================================================
// DELETE /api/me/profile/avatar
// Safely removes the authenticated applicant's profile picture
// ======================================================
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const currentProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { profileImage: true },
    });

    const oldKey = currentProfile?.profileImage;

    if (oldKey && isSafeAvatarKey(oldKey)) {
      await deleteAvatarFromDisk(oldKey);
    }

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { profileImage: null },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile picture removed successfully.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE_AVATAR_ERROR:", err);
    return errorResponse("Failed to remove profile picture.", 500);
  }
}
