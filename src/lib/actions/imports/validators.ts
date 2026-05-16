export type ImportType = "rooms_csv" | "guests_csv";

export type ImportRowValidation = {
  rawPayload: Record<string, string>;
  normalizedPayload: Record<string, string | number | boolean | null>;
  status: "valid" | "invalid";
  errors: string[];
};

const roomRequiredHeaders = [
  "building_name",
  "room_number",
  "room_type",
  "capacity",
] as const;

const guestRequiredHeaders = ["full_name", "guest_category"] as const;

const dbGuestCategories = new Set([
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

const dbGuestGenders = new Set([
  "male",
  "female",
  "other",
  "undisclosed",
]);

const dbRoomGenderRestrictions = new Set(["male", "female", "any"]);

const commonSecurityClearanceStatuses = new Set([
  "pending",
  "cleared",
  "rejected",
  "expired",
  "not_required",
]);

function normalizeText(value: string | undefined): string | null {
  const clean = value?.replace(/\s+/g, " ").trim() ?? "";

  return clean.length > 0 ? clean : null;
}

function normalizeSlugText(value: string | undefined): string | null {
  const clean = normalizeText(value);

  if (!clean) return null;

  return clean
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeEmail(value: string | undefined): string | null {
  const clean = normalizeText(value);

  return clean ? clean.toLowerCase() : null;
}

function normalizeInteger(value: string | undefined): number | null {
  const clean = value?.trim() ?? "";

  if (!clean) return null;

  if (!/^\d+$/.test(clean)) {
    return null;
  }

  const parsed = Number(clean);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeBoolean(value: string | undefined): boolean | null {
  const clean = normalizeSlugText(value);

  if (!clean) return null;

  if (["true", "yes", "y", "1"].includes(clean)) return true;
  if (["false", "no", "n", "0"].includes(clean)) return false;

  return null;
}

function validateHeaders(
  headers: string[],
  requiredHeaders: readonly string[],
): string[] {
  return requiredHeaders.filter((header) => !headers.includes(header));
}

export function validateImportHeaders(
  importType: ImportType,
  headers: string[],
): string[] {
  if (importType === "rooms_csv") {
    return validateHeaders(headers, roomRequiredHeaders);
  }

  return validateHeaders(headers, guestRequiredHeaders);
}

export function validateRoomRow(
  row: Record<string, string>,
): ImportRowValidation {
  const errors: string[] = [];

  const buildingName = normalizeText(row.building_name);
  const roomNumber = normalizeText(row.room_number);
  const roomType = normalizeSlugText(row.room_type);
  const capacity = normalizeInteger(row.capacity);

  const floorLabel = normalizeText(row.floor_label);
  const sectionLabel = normalizeText(row.section_label);
  const bedType = normalizeText(row.bed_type);
  const genderRestriction = normalizeSlugText(row.gender_restriction);

  const isVip = normalizeBoolean(row.is_vip) ?? false;
  const isDelegateSuitable =
    normalizeBoolean(row.is_delegate_suitable) ?? false;

  const notes = normalizeText(row.notes);

  if (!buildingName) {
    errors.push("building_name is required.");
  }

  if (!roomNumber) {
    errors.push("room_number is required.");
  }

  if (!roomType) {
    errors.push("room_type is required.");
  }

  if (capacity === null || capacity < 1) {
    errors.push("capacity must be a positive whole number.");
  }

  if (
    genderRestriction &&
    !dbRoomGenderRestrictions.has(genderRestriction)
  ) {
    errors.push("gender_restriction must be one of: male, female, any.");
  }

  return {
    rawPayload: row,
    normalizedPayload: {
      building_name: buildingName,
      room_number: roomNumber,
      room_type: roomType,
      capacity,
      floor_label: floorLabel,
      section_label: sectionLabel,
      bed_type: bedType,
      gender_restriction: genderRestriction,
      is_vip: isVip,
      is_delegate_suitable: isDelegateSuitable,
      notes,
    },
    status: errors.length === 0 ? "valid" : "invalid",
    errors,
  };
}

export function validateGuestRow(
  row: Record<string, string>,
): ImportRowValidation {
  const errors: string[] = [];

  const fullName = normalizeText(row.full_name);
  const guestCategory = normalizeSlugText(row.guest_category);
  const gender = normalizeSlugText(row.gender);

  const organization = normalizeText(row.organization ?? row.organization_name);
  const departmentOrProject = normalizeText(row.department_or_project);
  const nationality = normalizeText(row.nationality);

  const phone = normalizeText(row.phone);
  const email = normalizeEmail(row.email);

  const idOrPassportNumber = normalizeText(row.id_or_passport_number);
  const emergencyContactName = normalizeText(row.emergency_contact_name);
  const emergencyContactPhone = normalizeText(row.emergency_contact_phone);

  const isVipFromColumn = normalizeBoolean(row.is_vip);
  const securityClearanceStatus = normalizeSlugText(
    row.security_clearance_status,
  );

  const notes = normalizeText(row.notes);
  const managerNotes = normalizeText(row.manager_notes);

  if (!fullName || fullName.length < 2) {
    errors.push("full_name must be at least 2 characters.");
  }

  if (!guestCategory) {
    errors.push("guest_category is required.");
  } else if (!dbGuestCategories.has(guestCategory)) {
    errors.push(
      "guest_category must be one of: eu_delegate, american_delegate, government_official, company_staff, contractor, consultant, visitor, transit_guest, vip_guest, long_stay_guest.",
    );
  }

  if (gender && !dbGuestGenders.has(gender)) {
    errors.push("gender must be one of: male, female, other, undisclosed.");
  }

  if (!phone && !email) {
    errors.push("At least one contact field is required: phone or email.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("email is invalid.");
  }

  if (
    securityClearanceStatus &&
    !commonSecurityClearanceStatuses.has(securityClearanceStatus)
  ) {
    errors.push(
      "security_clearance_status must be one of: pending, cleared, rejected, expired, not_required.",
    );
  }

  const isVip = isVipFromColumn ?? guestCategory === "vip_guest";

  return {
    rawPayload: row,
    normalizedPayload: {
      full_name: fullName,
      guest_category: guestCategory,
      gender,
      organization,
      department_or_project: departmentOrProject,
      nationality,
      phone,
      email,
      id_or_passport_number: idOrPassportNumber,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      is_vip: isVip,
      security_clearance_status: securityClearanceStatus,
      notes,
      manager_notes: managerNotes,
    },
    status: errors.length === 0 ? "valid" : "invalid",
    errors,
  };
}