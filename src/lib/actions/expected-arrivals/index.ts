"use server";

import "server-only";

import { z } from "zod";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { Enums } from "@/lib/db/types";
import {
  allocateExpectedArrival,
  cancelExpectedArrival,
  createExpectedArrival,
  createExpectedArrivalWithGuest,
  markExpectedArrivalArrived,
  markExpectedArrivalNoShow,
  updateExpectedArrival,
} from "@/lib/queries/expected-arrivals";

export type ExpectedArrivalActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

const UUID_SCHEMA = z.string().uuid("Invalid ID.");

const GUEST_CATEGORY_SCHEMA = z.enum([
  "eu_delegate",
  "american_delegate",
  "government_official",
  "company_staff",
  "contractor",
  "consultant",
  "visitor",
  "transit_guest",
  "vip_guest",
  "long_stay_guest",
]);

const GENDER_SCHEMA = z
  .enum(["male", "female", "other", "undisclosed"])
  .optional();

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

const createExpectedArrivalSchema = z
  .object({
    guestId: UUID_SCHEMA,
    campId: UUID_SCHEMA,
    expectedArrivalAt: requiredDateTimeSchema,
    expectedDepartureAt: optionalDateTimeSchema,
    purpose: optionalTextSchema,
    hostName: optionalTextSchema,
    hostDepartment: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    validateArrivalWindow(value.expectedArrivalAt, value.expectedDepartureAt, ctx);
  });

const createExpectedArrivalWithGuestSchema = z
  .object({
    campId: UUID_SCHEMA,
    fullName: z.string().trim().min(2, "Guest name is required."),
    guestCategory: GUEST_CATEGORY_SCHEMA,
    expectedArrivalAt: requiredDateTimeSchema,
    expectedDepartureAt: optionalDateTimeSchema,

    gender: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : undefined))
      .pipe(GENDER_SCHEMA),

    nationality: optionalTextSchema,
    organization: optionalTextSchema,
    departmentOrProject: optionalTextSchema,
    phone: optionalTextSchema,
    email: optionalTextSchema,
    idOrPassportNumber: optionalTextSchema,

    purpose: optionalTextSchema,
    hostName: optionalTextSchema,
    hostDepartment: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    validateArrivalWindow(value.expectedArrivalAt, value.expectedDepartureAt, ctx);
  });

const updateExpectedArrivalSchema = z
  .object({
    expectedArrivalId: UUID_SCHEMA,
    guestId: UUID_SCHEMA.optional(),
    expectedArrivalAt: optionalDateTimeSchema,
    expectedDepartureAt: optionalDateTimeSchema,
    purpose: optionalTextSchema,
    hostName: optionalTextSchema,
    hostDepartment: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.expectedArrivalAt || !value.expectedDepartureAt) {
      return;
    }

    validateArrivalWindow(value.expectedArrivalAt, value.expectedDepartureAt, ctx);
  });

const expectedArrivalIdSchema = z.object({
  expectedArrivalId: UUID_SCHEMA,
  notes: optionalTextSchema,
  reason: optionalTextSchema,
});

const allocateExpectedArrivalSchema = z.object({
  expectedArrivalId: UUID_SCHEMA,
  roomId: UUID_SCHEMA,
  expectedDepartureAt: optionalDateTimeSchema,
  notes: optionalTextSchema,
});

async function requireExpectedArrivalCreateAccess(): Promise<void> {
  await requirePermission("expected_arrivals.create");
}

async function requireExpectedArrivalWithGuestCreateAccess(): Promise<void> {
  await requirePermission("guests.create");
  await requirePermission("expected_arrivals.create");
}

async function requireExpectedArrivalUpdateAccess(): Promise<void> {
  await requirePermission("expected_arrivals.update");
}

async function requireExpectedArrivalCancelAccess(): Promise<void> {
  await requirePermission("expected_arrivals.cancel");
}

async function requireExpectedArrivalNoShowAccess(): Promise<void> {
  await requirePermission("expected_arrivals.mark_no_show");
}

async function requireExpectedArrivalAllocationAccess(): Promise<void> {
  await requirePermission("expected_arrivals.allocate");
}

function validateArrivalWindow(
  expectedArrivalAt: string | undefined,
  expectedDepartureAt: string | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!expectedArrivalAt) {
    return;
  }

  const arrivalAt = new Date(expectedArrivalAt).getTime();

  if (Number.isNaN(arrivalAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["expectedArrivalAt"],
      message: "Invalid expected arrival date.",
    });
  }

  if (!expectedDepartureAt) {
    return;
  }

  const departureAt = new Date(expectedDepartureAt).getTime();

  if (Number.isNaN(departureAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["expectedDepartureAt"],
      message: "Invalid expected departure date.",
    });
  }

  if (!Number.isNaN(arrivalAt) && !Number.isNaN(departureAt)) {
    if (departureAt <= arrivalAt) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedDepartureAt"],
        message: "Expected departure must be after expected arrival.",
      });
    }
  }
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

function requireExpectedArrivalId(value: string | null): string {
  if (!value) {
    throw new Error("Expected arrival ID was not returned.");
  }

  return value;
}

function getExpectedArrivalRedirect(value: string | null): string {
  return APP_ROUTES.reception.expectedArrivalDetail(
    requireExpectedArrivalId(value),
  );
}

function failFromUnknown(error: unknown): ExpectedArrivalActionState {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

function failFromZod(error: z.ZodError): ExpectedArrivalActionState {
  return {
    ok: false,
    error: "Please correct the highlighted fields.",
    fieldErrors: getFieldErrors(error),
  };
}

export async function createExpectedArrivalAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = createExpectedArrivalSchema.safeParse({
    guestId: getString(formData, "guestId"),
    campId: getString(formData, "campId"),
    expectedArrivalAt: getString(formData, "expectedArrivalAt"),
    expectedDepartureAt: getString(formData, "expectedDepartureAt"),
    purpose: getString(formData, "purpose"),
    hostName: getString(formData, "hostName"),
    hostDepartment: getString(formData, "hostDepartment"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalCreateAccess();

  try {
    const arrival = await createExpectedArrival(parsed.data);

    return {
      ok: true,
      message: "Expected arrival created.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function createExpectedArrivalWithGuestAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = createExpectedArrivalWithGuestSchema.safeParse({
    campId: getString(formData, "campId"),
    fullName: getString(formData, "fullName"),
    guestCategory: getString(formData, "guestCategory"),
    expectedArrivalAt: getString(formData, "expectedArrivalAt"),
    expectedDepartureAt: getString(formData, "expectedDepartureAt"),

    gender: getString(formData, "gender"),
    nationality: getString(formData, "nationality"),
    organization: getString(formData, "organization"),
    departmentOrProject: getString(formData, "departmentOrProject"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    idOrPassportNumber: getString(formData, "idOrPassportNumber"),

    purpose: getString(formData, "purpose"),
    hostName: getString(formData, "hostName"),
    hostDepartment: getString(formData, "hostDepartment"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalWithGuestCreateAccess();

  try {
    const arrival = await createExpectedArrivalWithGuest({
      campId: parsed.data.campId,
      fullName: parsed.data.fullName,
      guestCategory: parsed.data.guestCategory as Enums<"guest_category">,
      expectedArrivalAt: parsed.data.expectedArrivalAt,
      expectedDepartureAt: parsed.data.expectedDepartureAt,

      gender: parsed.data.gender,
      nationality: parsed.data.nationality,
      organization: parsed.data.organization,
      departmentOrProject: parsed.data.departmentOrProject,
      phone: parsed.data.phone,
      email: parsed.data.email,
      idOrPassportNumber: parsed.data.idOrPassportNumber,

      purpose: parsed.data.purpose,
      hostName: parsed.data.hostName,
      hostDepartment: parsed.data.hostDepartment,
      notes: parsed.data.notes,
    });

    return {
      ok: true,
      message: "Guest and expected arrival created.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function updateExpectedArrivalAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = updateExpectedArrivalSchema.safeParse({
    expectedArrivalId: getString(formData, "expectedArrivalId"),
    guestId: getString(formData, "guestId"),
    expectedArrivalAt: getString(formData, "expectedArrivalAt"),
    expectedDepartureAt: getString(formData, "expectedDepartureAt"),
    purpose: getString(formData, "purpose"),
    hostName: getString(formData, "hostName"),
    hostDepartment: getString(formData, "hostDepartment"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalUpdateAccess();

  try {
    const arrival = await updateExpectedArrival(parsed.data);

    return {
      ok: true,
      message: "Expected arrival updated.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function markExpectedArrivalArrivedAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = expectedArrivalIdSchema.safeParse({
    expectedArrivalId: getString(formData, "expectedArrivalId"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalUpdateAccess();

  try {
    const arrival = await markExpectedArrivalArrived(
      parsed.data.expectedArrivalId,
      parsed.data.notes,
    );

    return {
      ok: true,
      message: "Expected arrival marked as arrived.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function cancelExpectedArrivalAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = expectedArrivalIdSchema.safeParse({
    expectedArrivalId: getString(formData, "expectedArrivalId"),
    reason: getString(formData, "reason"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalCancelAccess();

  try {
    const arrival = await cancelExpectedArrival(
      parsed.data.expectedArrivalId,
      parsed.data.reason,
    );

    return {
      ok: true,
      message: "Expected arrival cancelled.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function markExpectedArrivalNoShowAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = expectedArrivalIdSchema.safeParse({
    expectedArrivalId: getString(formData, "expectedArrivalId"),
    reason: getString(formData, "reason"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalNoShowAccess();

  try {
    const arrival = await markExpectedArrivalNoShow(
      parsed.data.expectedArrivalId,
      parsed.data.reason,
    );

    return {
      ok: true,
      message: "Expected arrival marked as no-show.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}

export async function allocateExpectedArrivalAction(
  _previousState: ExpectedArrivalActionState,
  formData: FormData,
): Promise<ExpectedArrivalActionState> {
  const parsed = allocateExpectedArrivalSchema.safeParse({
    expectedArrivalId: getString(formData, "expectedArrivalId"),
    roomId: getString(formData, "roomId"),
    expectedDepartureAt: getString(formData, "expectedDepartureAt"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  await requireExpectedArrivalAllocationAccess();

  try {
    const arrival = await allocateExpectedArrival(parsed.data);

    return {
      ok: true,
      message: "Room allocated from expected arrival.",
      redirectTo: getExpectedArrivalRedirect(arrival.expected_arrival_id),
    };
  } catch (error) {
    return failFromUnknown(error);
  }
}
