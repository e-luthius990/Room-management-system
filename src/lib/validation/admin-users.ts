import { z } from "zod";
import {
  CAMP_ACCESS_LEVEL_LABELS,
  CAMP_ACCESS_LEVELS,
  CAMP_SCOPED_ROLE_KEYS,
  DEFAULT_ROLE_CAMP_ACCESS_LEVEL,
  INVITABLE_ROLE_KEYS,
  SYSTEM_ADMIN_INVITABLE_ROLE_KEYS,
  SYSTEM_ROLE_LABELS,
  type CampAccessLevel,
  type CampScopedRoleKey,
  type InvitableRoleKey,
  type SystemAdminInvitableRoleKey,
} from "@/lib/auth/types";

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalLowerText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeRequiredLowerText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(120, "This field is too long.").nullable(),
);

const optionalPhone = z.preprocess(
  normalizeOptionalText,
  z
    .string()
    .min(7, "Phone number is too short.")
    .max(32, "Phone number is too long.")
    .nullable(),
);

const requiredFullName = z.preprocess(
  normalizeRequiredText,
  z
    .string()
    .min(2, "Full name is required.")
    .max(120, "Full name is too long."),
);

const requiredEmail = z.preprocess(
  normalizeRequiredLowerText,
  z
    .string()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),
);

const optionalCampId = z.preprocess(
  normalizeOptionalText,
  z.string().uuid("Select a valid camp.").nullable(),
);

const optionalCampAccessLevel = z.preprocess(
  normalizeOptionalLowerText,
  z.enum(CAMP_ACCESS_LEVELS).nullable(),
);

const systemAdminInviteRoleKeySchema = z.preprocess(
  normalizeRequiredLowerText,
  z.enum(SYSTEM_ADMIN_INVITABLE_ROLE_KEYS),
);

const superAdminInviteRoleKeySchema = z.preprocess(
  normalizeRequiredLowerText,
  z.enum(INVITABLE_ROLE_KEYS),
);

const baseInviteUserSchema = z.object({
  fullName: requiredFullName,
  email: requiredEmail,
  phone: optionalPhone,
  department: optionalText,
  jobTitle: optionalText,
  campId: optionalCampId,

  /**
   * Optional by design.
   * Normal invite flow should derive this from role on the server.
   * Super Admin can override only if your server action allows it.
   */
  accessLevel: optionalCampAccessLevel,
});

function isCampRole(value: string): value is CampScopedRoleKey {
  return CAMP_SCOPED_ROLE_KEYS.includes(value as CampScopedRoleKey);
}

function validateCampAccessForRole(
  value: {
    roleKey: string;
    campId: string | null;
    accessLevel: CampAccessLevel | null;
  },
  ctx: z.RefinementCtx,
): void {
  const campScoped = isCampRole(value.roleKey);

  if (campScoped && !value.campId) {
    ctx.addIssue({
      code: "custom",
      path: ["campId"],
      message: "Select a camp for this role.",
    });
  }

  if (!campScoped && value.campId) {
    ctx.addIssue({
      code: "custom",
      path: ["campId"],
      message: "System roles must not be assigned to a camp.",
    });
  }

  if (!campScoped && value.accessLevel) {
    ctx.addIssue({
      code: "custom",
      path: ["accessLevel"],
      message: "System roles must not have camp access level.",
    });
  }
}

/**
 * System Admin invite schema.
 * System Admins can invite only camp-scoped roles.
 */
export const inviteUserSchema = baseInviteUserSchema
  .extend({
    roleKey: systemAdminInviteRoleKeySchema,
  })
  .superRefine(validateCampAccessForRole);

/**
 * Super Admin invite schema.
 * Super Admins can invite System Admins and camp-scoped roles.
 */
export const superAdminInviteUserSchema = baseInviteUserSchema
  .extend({
    roleKey: superAdminInviteRoleKeySchema,
  })
  .superRefine(validateCampAccessForRole);

export const campAccessLevelLabels: Record<CampAccessLevel, string> =
  CAMP_ACCESS_LEVEL_LABELS;

export const roleKeyLabels: Record<InvitableRoleKey, string> = {
  system_admin: SYSTEM_ROLE_LABELS.system_admin,
  camp_manager: SYSTEM_ROLE_LABELS.camp_manager,
  receptionist: SYSTEM_ROLE_LABELS.receptionist,
  security: SYSTEM_ROLE_LABELS.security,
  executive_viewer: SYSTEM_ROLE_LABELS.executive_viewer,
};

export const campAccessLevelOptions: ReadonlyArray<{
  value: CampAccessLevel;
  label: string;
}> = CAMP_ACCESS_LEVELS.map((value) => ({
  value,
  label: campAccessLevelLabels[value],
}));

export const invitableRoleOptions: ReadonlyArray<{
  value: SystemAdminInvitableRoleKey;
  label: string;
}> = SYSTEM_ADMIN_INVITABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleKeyLabels[value],
}));

export const superAdminInvitableRoleOptions: ReadonlyArray<{
  value: InvitableRoleKey;
  label: string;
}> = INVITABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleKeyLabels[value],
}));

export const defaultRoleCampAccessLevelOptions: ReadonlyArray<{
  roleKey: CampScopedRoleKey;
  accessLevel: CampAccessLevel;
  label: string;
}> = CAMP_SCOPED_ROLE_KEYS.map((roleKey) => {
  const accessLevel = DEFAULT_ROLE_CAMP_ACCESS_LEVEL[roleKey];

  return {
    roleKey,
    accessLevel,
    label: campAccessLevelLabels[accessLevel],
  };
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export type SuperAdminInviteUserInput = z.infer<
  typeof superAdminInviteUserSchema
>;

export type InviteUserFormInput = z.input<typeof inviteUserSchema>;

export type SuperAdminInviteUserFormInput = z.input<
  typeof superAdminInviteUserSchema
>;