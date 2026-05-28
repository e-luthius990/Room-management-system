"use server";

import "server-only";

import { z } from "zod";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  cancelFieldAbsence,
  createFieldAbsence,
  extendFieldAbsence,
  markFieldAbsenceReturned,
} from "@/lib/queries/field-absences";

export type FieldAbsenceActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

const UUID_SCHEMA = z.string().uuid("Invalid ID.");

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const requiredDateTimeSchema = z
  .string()
  .trim()
  .min(1, "This date is required.");

const optionalDateTimeSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const createFieldAbsenceSchema = z
  .object({
    stayId: UUID_SCHEMA,
    departureAt: requiredDateTimeSchema,
    expectedReturnAt: requiredDateTimeSchema,
    destination: optionalTextSchema,
    reason: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    const departureAt = new Date(value.departureAt).getTime();
    const expectedReturnAt = new Date(value.expectedReturnAt).getTime();

    if (Number.isNaN(departureAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["departureAt"],
        message: "Invalid departure date.",
      });
    }

    if (Number.isNaN(expectedReturnAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedReturnAt"],
        message: "Invalid expected return date.",
      });
    }

    if (!Number.isNaN(departureAt) && !Number.isNaN(expectedReturnAt)) {
      if (expectedReturnAt <= departureAt) {
        ctx.addIssue({
          code: "custom",
          path: ["expectedReturnAt"],
          message: "Expected return must be after departure.",
        });
      }
    }
  });

const extendFieldAbsenceSchema = z
  .object({
    fieldAbsenceId: UUID_SCHEMA,
    expectedReturnAt: requiredDateTimeSchema,
    reason: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    if (Number.isNaN(new Date(value.expectedReturnAt).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedReturnAt"],
        message: "Invalid expected return date.",
      });
    }
  });

const markFieldAbsenceReturnedSchema = z.object({
  fieldAbsenceId: UUID_SCHEMA,
  actualReturnAt: optionalDateTimeSchema,
  returnNotes: optionalTextSchema,
});

const cancelFieldAbsenceSchema = z.object({
  fieldAbsenceId: UUID_SCHEMA,
  reason: optionalTextSchema,
});

async function requireFieldAbsenceCreateAccess(): Promise<void> {
  await requirePermission("field_absences.create");
}

async function requireFieldAbsenceUpdateAccess(): Promise<void> {
  await requirePermission("field_absences.update");
}

async function requireFieldAbsenceReturnAccess(): Promise<void> {
  await requirePermission("field_absences.mark_returned");
}

async function requireFieldAbsenceCancelAccess(): Promise<void> {
  await requirePermission("field_absences.cancel");
}

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

function getFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

function requireFieldAbsenceId(value: string | null): string {
  if (!value) {
    throw new Error("Field absence ID was not returned.");
  }

  return value;
}

function getFieldAbsenceRedirect(value: string | null): string {
  return APP_ROUTES.fieldAbsences.detail(requireFieldAbsenceId(value));
}

function failFromUnknown(error: unknown): FieldAbsenceActionState {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

function failFromZod(error: z.ZodError): FieldAbsenceActionState {
  return {
    ok: false,
    error: "Please correct the highlighted fields.",
    fieldErrors: getFieldErrors(error),
  };
}

export async function createFieldAbsenceAction(
  _previousState: FieldAbsenceActionState,
  formData: FormData,
): Promise<FieldAbsenceActionState> {
  const parsed = createFieldAbsenceSchema.safeParse({
    stayId: getString(formData, "stayId"),
    departureAt: getString(formData, "departureAt"),
    expectedReturnAt: getString(formData, "expectedReturnAt"),
    destination: getString(formData, "destination"),
    reason: getString(formData, "reason"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireFieldAbsenceCreateAccess();

  try {
    const absence = await createFieldAbsence(parsed.data);

    return {
      ok: true,
      message: "Field absence created.",
      redirectTo: getFieldAbsenceRedirect(absence.field_absence_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function extendFieldAbsenceAction(
  _previousState: FieldAbsenceActionState,
  formData: FormData,
): Promise<FieldAbsenceActionState> {
  const parsed = extendFieldAbsenceSchema.safeParse({
    fieldAbsenceId: getString(formData, "fieldAbsenceId"),
    expectedReturnAt: getString(formData, "expectedReturnAt"),
    reason: getString(formData, "reason"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireFieldAbsenceUpdateAccess();

  try {
    const absence = await extendFieldAbsence(parsed.data);

    return {
      ok: true,
      message: "Field absence extended.",
      redirectTo: getFieldAbsenceRedirect(absence.field_absence_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function markFieldAbsenceReturnedAction(
  _previousState: FieldAbsenceActionState,
  formData: FormData,
): Promise<FieldAbsenceActionState> {
  const parsed = markFieldAbsenceReturnedSchema.safeParse({
    fieldAbsenceId: getString(formData, "fieldAbsenceId"),
    actualReturnAt: getString(formData, "actualReturnAt"),
    returnNotes: getString(formData, "returnNotes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireFieldAbsenceReturnAccess();

  try {
    const absence = await markFieldAbsenceReturned(parsed.data);

    return {
      ok: true,
      message: "Field absence marked as returned.",
      redirectTo: getFieldAbsenceRedirect(absence.field_absence_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function cancelFieldAbsenceAction(
  _previousState: FieldAbsenceActionState,
  formData: FormData,
): Promise<FieldAbsenceActionState> {
  const parsed = cancelFieldAbsenceSchema.safeParse({
    fieldAbsenceId: getString(formData, "fieldAbsenceId"),
    reason: getString(formData, "reason"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireFieldAbsenceCancelAccess();

  try {
    const absence = await cancelFieldAbsence(
      parsed.data.fieldAbsenceId,
      parsed.data.reason,
    );

    return {
      ok: true,
      message: "Field absence cancelled.",
      redirectTo: getFieldAbsenceRedirect(absence.field_absence_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}
