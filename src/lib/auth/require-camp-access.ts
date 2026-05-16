import "server-only";

import { notFound } from "next/navigation";
import { hasCampAccess } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/require-auth";
import type { CampAccessLevel, CurrentUserContext } from "@/lib/auth/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function requireCampAccess(
  campId: string,
  minimumLevel: CampAccessLevel = "viewer",
): Promise<CurrentUserContext> {
  if (!UUID_PATTERN.test(campId)) {
    notFound();
  }

  const currentUser = await requireAuth();

  if (!hasCampAccess(currentUser, campId, minimumLevel)) {
    notFound();
  }

  return currentUser;
}