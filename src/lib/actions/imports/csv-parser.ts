export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function assertValidHeaders(headers: string[]): void {
  if (headers.length === 0) {
    throw new CsvParseError("CSV file has no headers.");
  }

  const emptyHeaderIndex = headers.findIndex((header) => header.length === 0);

  if (emptyHeaderIndex >= 0) {
    throw new CsvParseError(
      `CSV header ${emptyHeaderIndex + 1} is empty.`,
    );
  }

  const seen = new Set<string>();

  for (const header of headers) {
    if (seen.has(header)) {
      throw new CsvParseError(`CSV has duplicate header: ${header}.`);
    }

    seen.add(header);
  }
}

export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";

      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (insideQuotes) {
    throw new CsvParseError("CSV has an unclosed quoted value.");
  }

  currentRow.push(currentCell);

  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    throw new CsvParseError("CSV file is empty.");
  }

  const headers = rows[0].map(normalizeHeader);
  assertValidHeaders(headers);

  const dataRows = rows.slice(1).map((row, rowIndex) => {
    if (row.length > headers.length) {
      throw new CsvParseError(
        `CSV row ${rowIndex + 2} has more columns than the header row.`,
      );
    }

    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });

    return record;
  });

  return {
    headers,
    rows: dataRows,
  };
}