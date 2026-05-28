import type { CurrentCampAccess, RoleKey } from "@/lib/auth/types";

const CAMP_SELECT_ROLES = new Set<RoleKey>([
  "super_admin",
  "system_admin",
  "executive_viewer",
]);

export function canSelectCampFilter(roleKey: RoleKey): boolean {
  return CAMP_SELECT_ROLES.has(roleKey);
}

export function getAssignedCampLabel(
  campAccess: readonly CurrentCampAccess[],
): string {
  if (campAccess.length === 0) {
    return "No assigned camp";
  }

  if (campAccess.length === 1) {
    return campAccess[0]?.camp_name ?? "Assigned camp";
  }

  return campAccess.map((access) => access.camp_name).join(", ");
}

export function filterByCampAccess<
  Item extends {
    camp_id: string;
  },
>(
  items: readonly Item[],
  campAccess: readonly CurrentCampAccess[],
): Item[] {
  const campIds = new Set(campAccess.map((access) => access.camp_id));

  return items.filter((item) => campIds.has(item.camp_id));
}

export function filterByPrimaryCampAccess<
  Item extends {
    primary_camp_id: string;
  },
>(
  items: readonly Item[],
  campAccess: readonly CurrentCampAccess[],
): Item[] {
  const campIds = new Set(campAccess.map((access) => access.camp_id));

  return items.filter((item) => campIds.has(item.primary_camp_id));
}
