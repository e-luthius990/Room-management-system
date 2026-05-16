import { z } from "zod";

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

export type InvitableRoleKey = (typeof INVITABLE_ROLE_KEYS)[number];

export type SuperAdminInvitableRoleKey =
  (typeof SUPER_ADMIN_INVITABLE_ROLE_KEYS)[number];

export type CampAccessLevel = (typeof CAMP_ACCESS_LEVELS)[number];

const SYSTEM_ROLE_KEYS = new Set<string>(["super_admin", "system_admin"]);

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeLowerText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(120, "This field is too long.").nullable(),
);

const requiredFullName = z.preprocess(
  normalizeRequiredText,
  z
    .string()
    .min(2, "Full name is required.")
    .max(120, "Full name is too long."),
);

const requiredEmail = z.preprocess(
  normalizeLowerText,
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
  normalizeOptionalText,
  z.enum(CAMP_ACCESS_LEVELS).nullable(),
);

const inviteRoleKeySchema = z.preprocess(
  normalizeLowerText,
  z.enum(INVITABLE_ROLE_KEYS),
);

const superAdminInviteRoleKeySchema = z.preprocess(
  normalizeLowerText,
  z.enum(SUPER_ADMIN_INVITABLE_ROLE_KEYS),
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

function validateCampAccessForRole(
  value: {
    roleKey: string;
    campId: string | null;
    accessLevel: CampAccessLevel | null;
  },
  ctx: z.RefinementCtx,
): void {
  const isSystemRole = SYSTEM_ROLE_KEYS.has(value.roleKey);

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

export const campAccessLevelLabels: Record<CampAccessLevel, string> = {
  viewer: "Viewer",
  operator: "Operator",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

export const roleKeyLabels: Record<SuperAdminInvitableRoleKey, string> = {
  system_admin: "System Admin",
  camp_manager: "Camp Manager",
  receptionist: "Receptionist",
  security: "Security",
  executive_viewer: "Executive Viewer",
};

export const campAccessLevelOptions: ReadonlyArray<{
  value: CampAccessLevel;
  label: string;
}> = CAMP_ACCESS_LEVELS.map((value) => ({
  value,
  label: campAccessLevelLabels[value],
}));

export const invitableRoleOptions: ReadonlyArray<{
  value: InvitableRoleKey;
  label: string;
}> = INVITABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleKeyLabels[value],
}));

export const superAdminInvitableRoleOptions: ReadonlyArray<{
  value: SuperAdminInvitableRoleKey;
  label: string;
}> = SUPER_ADMIN_INVITABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleKeyLabels[value],
}));

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export type SuperAdminInviteUserInput = z.infer<
  typeof superAdminInviteUserSchema
>;

export type InviteUserFormInput = z.input<typeof inviteUserSchema>;

export type SuperAdminInviteUserFormInput = z.input<
  typeof superAdminInviteUserSchema
>;