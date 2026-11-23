import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function isValidSocials(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length > 20) {
    return false;
  }

  return value.every((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("name" in item) ||
      !("url" in item) ||
      typeof item.name !== "string" ||
      typeof item.url !== "string"
    ) {
      return false;
    }

    const name = item.name.trim();
    const url = item.url.trim();

    if (!name || name.length > 50 || url.length > 500) {
      return false;
    }

    try {
      const parsedUrl = new URL(url);

      return ["http:", "https:"].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  });
}

// ======================================================
// GET /api/me/profile
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const profile = await prisma.userProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        phone: true,
        headline: true,
        bio: true,
        location: true,
        profileImage: true,
        socials: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile fetched successfully.",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          profile,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET_ME_PROFILE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// PATCH /api/me/profile
// ======================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return errorResponse("Invalid request body.", 400);
    }

    const input = body as Record<string, unknown>;

    const allowedFields = [
      "name",
      "phone",
      "headline",
      "bio",
      "location",
      "profileImage",
      "socials",
    ];

    const receivedFields = Object.keys(input);

    if (receivedFields.length === 0) {
      return errorResponse("No profile fields provided.", 400);
    }

    const invalidFields = receivedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return errorResponse(
        `Unsupported fields: ${invalidFields.join(", ")}`,
        400,
      );
    }

    const data: Prisma.UserProfileUpdateInput = {};

    let updatedUser: { id: string; name: string | null; email: string } | null = null;

    // Name
    if ("name" in input) {
      if (
        typeof input.name !== "string" ||
        input.name.trim().length < 2 ||
        input.name.trim().length > 150
      ) {
        return errorResponse("Name must be between 2 and 150 characters.", 400);
      }

      updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          name: input.name.trim(),
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    // Phone
    if ("phone" in input) {
      if (input.phone === null || input.phone === "") {
        data.phone = null;
      } else {
        if (typeof input.phone !== "string") {
          return errorResponse("Phone number must be a string.", 400);
        }
        const trimmedPhone = input.phone.trim();
        // Strict numeric-only validation: digits 0-9 only, between 7 and 15 digits (preserves leading zeroes)
        if (!/^\d{7,15}$/.test(trimmedPhone)) {
          return errorResponse(
            "Invalid phone number. Must contain digits only (7 to 15 digits) without letters or special characters.",
            400,
          );
        }
        data.phone = trimmedPhone;
      }
    }

    // Headline
    if ("headline" in input) {
      if (
        input.headline !== null &&
        (typeof input.headline !== "string" ||
          input.headline.trim().length > 200)
      ) {
        return errorResponse("Invalid headline.", 400);
      }

      data.headline =
        typeof input.headline === "string"
          ? input.headline.trim() || null
          : null;
    }

    // Bio
    if ("bio" in input) {
      if (
        input.bio !== null &&
        (typeof input.bio !== "string" || input.bio.length > 5000)
      ) {
        return errorResponse("Invalid bio.", 400);
      }

      data.bio =
        typeof input.bio === "string" ? input.bio.trim() || null : null;
    }

    // Location
    if ("location" in input) {
      if (
        input.location !== null &&
        (typeof input.location !== "string" ||
          input.location.trim().length > 150)
      ) {
        return errorResponse("Invalid location.", 400);
      }

      data.location =
        typeof input.location === "string"
          ? input.location.trim() || null
          : null;
    }

    // Profile image URL
    if ("profileImage" in input) {
      if (input.profileImage === null || input.profileImage === "") {
        data.profileImage = null;
      } else {
        if (
          typeof input.profileImage !== "string" ||
          input.profileImage.length > 500
        ) {
          return errorResponse("Invalid profile image URL.", 400);
        }

        try {
          const parsedUrl = new URL(input.profileImage);

          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return errorResponse(
              "Profile image URL must use HTTP or HTTPS.",
              400,
            );
          }
        } catch {
          return errorResponse("Invalid profile image URL.", 400);
        }

        data.profileImage = input.profileImage.trim();
      }
    }

    // Social links
    if ("socials" in input) {
      if (input.socials === null) {
        data.socials = Prisma.JsonNull;
      } else {
        if (!isValidSocials(input.socials)) {
          return errorResponse("Invalid social links.", 400);
        }

        data.socials = input.socials as Prisma.InputJsonValue;
      }
    }

    const createData: Prisma.UserProfileUncheckedCreateInput = {
      userId: user.id,
    };

    if ("phone" in input) {
      createData.phone = data.phone as string | null;
    }

    if ("headline" in input) {
      createData.headline = data.headline as string | null;
    }

    if ("bio" in input) {
      createData.bio = data.bio as string | null;
    }

    if ("location" in input) {
      createData.location = data.location as string | null;
    }

    if ("profileImage" in input) {
      createData.profileImage = data.profileImage as string | null;
    }

    if ("socials" in input) {
      createData.socials = data.socials as Prisma.InputJsonValue;
    }

    const profile = await prisma.userProfile.upsert({
      where: {
        userId: user.id,
      },

      create: createData,

      update: data,

      select: {
        id: true,
        phone: true,
        headline: true,
        bio: true,
        location: true,
        profileImage: true,
        socials: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully.",
        data: {
          ...profile,
          user: updatedUser ?? {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH_ME_PROFILE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}
