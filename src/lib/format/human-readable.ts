const isoDatePattern =
  /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateValue(value: string): string | null {
  if (!isoDatePattern.test(value)) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hasTime = /[T\s]\d{2}:\d{2}/.test(value);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...(hasTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

export function formatReadableLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatReadableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en").format(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return "-";
    }

    const dateValue = formatDateValue(trimmed);
    if (dateValue) {
      return dateValue;
    }

    if (uuidPattern.test(trimmed)) {
      return `Reference ${trimmed.slice(0, 8)}`;
    }

    if (/[_-]/.test(trimmed) || /[a-z0-9][A-Z]/.test(trimmed)) {
      return formatReadableLabel(trimmed);
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    return value.map((item) => formatReadableValue(item)).join(", ");
  }

  if (typeof value === "object") {
    return formatReadableEntries(value as Record<string, unknown>)
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("; ");
  }

  return String(value);
}

export function formatReadableEntries(
  value: Record<string, unknown> | null | undefined,
): Array<{ label: string; value: string }> {
  if (!value) {
    return [];
  }

  return Object.entries(value)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
    .map(([key, entryValue]) => ({
      label: formatReadableLabel(key),
      value: formatReadableValue(entryValue),
    }));
}
