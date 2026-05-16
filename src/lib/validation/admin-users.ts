import { z } from "zod";

/**
 * -----------------------------
 * ROLE DEFINITIONS (SOURCE OF TRUTH)
 * -----------------------------
 */

export const INVITABLE_ROLE_KEYS = [
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export const SUPER_ADMIN_INVITABLE_ROLE_KEYS = [
  "system_admin",
  ...INVITABLE_ROLE_KEYS,
] as const;

export const CAMP_ACCESS_LEVELS = [
  "viewer",
  "operator",
  "supervisor",
  "manager",
  "admin",
] as const;

/**
 * TYPES DERIVED FROM SOURCE OF TRUTH
 */

export type InvitableRoleKey = typeof INVITABLE_ROLE_KEYS[number];

export type SuperAdminInvitableRoleKey =
  typeof SUPER_ADMIN_INVITABLE_ROLE_KEYS[number];

export type CampAccessLevel = typeof CAMP_ACCESS_LEVELS[number];

/**
 * IMPORTANT FIX:
 * Use literal unions derived from arrays ONLY via z.enum
 * This avoids mismatch between Zod + TS + runtime arrays
 */

const inviteRoleKeySchema = z.enum(INVITABLE_ROLE_KEYS);

const superAdminInviteRoleKeySchema = z.enum(
  SUPER_ADMIN_INVITABLE_ROLE_KEYS,
);

/**
 * CAMP ACCESS LEVEL SCHEMA
 */
const optionalCampAccessLevel = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : null),
  z.enum(CAMP_ACCESS_LEVELS).nullable(),
);

/**
 * TEXT NORMALIZERS
 */

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeRequiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLowerText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * BASE SCHEMA
 */

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(120).nullable(),
);

const requiredFullName = z.preprocess(
  normalizeRequiredText,
  z.string().min(2).max(120),
);

const requiredEmail = z.preprocess(
  normalizeLowerText,
  z.string().email().max(254),
);

const optionalCampId = z.preprocess(
  normalizeOptionalText,
  z.string().uuid().nullable(),
);

const baseInviteUserSchema = z.object({
  fullName: requiredFullName,
  email: requiredEmail,
  phone: optionalText,
  department: optionalText,
  jobTitle: optionalText,
  campId: optionalCampId,
  accessLevel: optionalCampAccessLevel,
});

/**
 * VALIDATION RULES (UNCHANGED BEHAVIOR, CLEANER LOGIC)
 */

function validateCampAccessForRole(
  value: {
    roleKey: string;
    campId: string | null;
    accessLevel: CampAccessLevel | null;
  },
  ctx: z.RefinementCtx,
): void {
  const isSystemRole =
    value.roleKey === "super_admin" ||
    value.roleKey === "system_admin";

  if (!isSystemRole && !value.campId) {
    ctx.addIssue({
      code: "custom",
      path: ["campId"],
      message: "Select a camp for this role.",
    });
  }

  if (!isSystemRole && !value.accessLevel) {
    ctx.addIssue({
      code: "custom",
      path: ["accessLevel"],
      message: "Select a camp access level.",
    });
  }

  if (isSystemRole && value.accessLevel && !value.campId) {
    ctx.addIssue({
      code: "custom",
      path: ["campId"],
      message: "Select a camp or remove the camp access level.",
    });
  }
}

/**
 * SCHEMAS
 */

export const inviteUserSchema = baseInviteUserSchema
  .extend({
    roleKey: inviteRoleKeySchema,
  })
  .superRefine(validateCampAccessForRole);

export const superAdminInviteUserSchema = baseInviteUserSchema
  .extend({
    roleKey: superAdminInviteRoleKeySchema,
  })
  .superRefine(validateCampAccessForRole);

/**
 * LABELS (SAFE, NO TYPE MISMATCH RISK)
 */

export const campAccessLevelLabels: Record<CampAccessLevel, string> = {
  viewer: "Viewer",
  operator: "Operator",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

export const roleKeyLabels: Record<
  typeof SUPER_ADMIN_INVITABLE_ROLE_KEYS[number],
  string
> = {
  system_admin: "System Admin",
  camp_manager: "Camp Manager",
  receptionist: "Receptionist",
  security: "Security",
  executive_viewer: "Executive Viewer",
};

/**
 * OPTIONS (DERIVED SAFELY)
 */

export const campAccessLevelOptions = CAMP_ACCESS_LEVELS.map((value) => ({
  value,
  label: campAccessLevelLabels[value],
}));

export const invitableRoleOptions = INVITABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleKeyLabels[value],
}));

export const superAdminInvitableRoleOptions =
  SUPER_ADMIN_INVITABLE_ROLE_KEYS.map((value) => ({
    value,
    label: roleKeyLabels[value],
  }));

/**
 * TYPES
 */

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type SuperAdminInviteUserInput = z.infer<
  typeof superAdminInviteUserSchema
>;

export type InviteUserFormInput = z.input<typeof inviteUserSchema>;
export type SuperAdminInviteUserFormInput = z.input<
  typeof superAdminInviteUserSchema
>;