import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CreateReportExportInput,
  ExportFormat,
  ReportType,
} from "@/lib/validation/reports";

type CsvRow = Record<string, unknown>;

type ReportColumn = {
  key: string;
  label: string;
  format?: (value: unknown, row: CsvRow) => string;
};

type ReportRowsResult = {
  title: string;
  filenameBase: string;
  columns: ReportColumn[];
  rows: CsvRow[];
  rowCount: number;
};

type CsvExportResult = {
  filename: string;
  csv: string;
  rowCount: number;
};

export type ReportExportFileResult = {
  filename: string;
  contentType: string;
  body: Buffer;
  rowCount: number;
};

type CampFilterQueryBuilder<TSelf> = {
  eq(column: string, value: string): TSelf;
};

type DateRangeFilterQueryBuilder<TSelf> = {
  gte(column: string, value: string): TSelf;
  lte(column: string, value: string): TSelf;
};

type RoomBoardReportRow = {
  camp_id: string | null;
  camp_name: string | null;
  building_name: string | null;
  room_number: string | null;
  room_type: string | null;
  current_status: string | null;
  condition_status: string | null;
  capacity: number | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
  current_guest_name: string | null;
  expected_departure_at: string | null;
};

type GuestReportRow = {
  full_name: string | null;
  guest_category: string | null;
  organization: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  security_clearance_status: string | null;
  created_at: string | null;
};

type OccupancyReportRow = {
  camp_id: string | null;
  camp_name: string | null;
  total_rooms: number | null;
  occupied_rooms: number | null;
  vacant_ready_rooms: number | null;
  reserved_rooms: number | null;
  pending_checkout_rooms: number | null;
  unavailable_rooms: number | null;
  occupancy_rate: number | string | null;
};

type CurrentStayReportRow = {
  stay_id: string | null;
  camp_id: string | null;
  camp_name: string | null;
  room_id: string | null;
  room_number: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: string | null;
  organization: string | null;
  is_vip: boolean | null;
  stay_status: string | null;
  arrival_time: string | null;
  expected_departure_at: string | null;
  security_event_id: string | null;
  security_entry_at: string | null;
  security_exit_at: string | null;
  security_last_seen_at: string | null;
  security_presence_status: string | null;
};

type ExitedGuestReportRow = {
  stay_id: string | null;
  camp_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: string | null;
  organization: string | null;
  room_id: string | null;
  room_number: string | null;
  stay_status: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  security_exit_at: string | null;
  departure_or_exit_time: string | null;
  exit_source: string | null;
};

const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatBoolean(value: unknown): string {
  return value === true ? "Yes" : "No";
}

function formatStatus(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "—";
  }

  return formatFallbackLabel(value);
}

function formatPercent(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "0%";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return `${String(value)}%`;
  }

  return `${numeric.toFixed(2).replace(/\.00$/, "")}%`;
}

function formatCellValue(column: ReportColumn, row: CsvRow): string {
  const value = row[column.key];

  if (column.format) {
    return column.format(value, row);
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return formatBoolean(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function toCsv(columns: ReportColumn[], rows: CsvRow[]): string {
  const lines = [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(formatCellValue(column, row))).join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function normalizeExportFormat(format: ExportFormat | undefined): ExportFormat {
  if (format === "csv" || format === "xlsx" || format === "pdf") {
    return format;
  }

  return "csv";
}

function reportFilenameBase(reportType: ReportType): string {
  return `${reportType.replaceAll("_", "-")}-report`;
}

function reportFilename(reportType: ReportType, format: ExportFormat): string {
  return `${reportFilenameBase(reportType)}.${format}`;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toXmlText(value: unknown): string {
  return toText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function buildSheetXml(columns: ReportColumn[], rows: CsvRow[]): string {
  const matrix = [
    columns.map((column) => column.label),
    ...rows.map((row) =>
      columns.map((column) => formatCellValue(column, row)),
    ),
  ];

  const columnWidths = columns
    .map((column, index) => {
      const contentWidths = rows.map(
        (row) => formatCellValue(column, row).length + 2,
      );

      const width = Math.min(
        Math.max(column.label.length + 4, ...contentWidths, 12),
        48,
      );

      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const sheetRows = matrix
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;

      const cells = row
        .map((cell, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowNumber}`;

          return [
            `<c r="${reference}" t="inlineStr">`,
            "<is>",
            `<t>${toXmlText(cell)}</t>`,
            "</is>",
            "</c>",
          ].join("");
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<cols>${columnWidths}</cols>`,
    `<sheetData>${sheetRows}</sheetData>`,
    "</worksheet>",
  ].join("");
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let index = 0; index < 8; index += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(): { date: number; time: number } {
  return {
    date: 0,
    time: 0,
  };
}

function createZip(files: ReadonlyArray<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  const { date, time } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = file.data;
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localDirectory.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, endRecord]);
}

function buildXlsx(columns: ReportColumn[], rows: CsvRow[]): Buffer {
  const files = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
          '<Default Extension="xml" ContentType="application/xml"/>',
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
          "</Types>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
          '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
          "</Relationships>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "docProps/core.xml",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ',
          'xmlns:dc="http://purl.org/dc/elements/1.1/" ',
          'xmlns:dcterms="http://purl.org/dc/terms/" ',
          'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ',
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
          "<dc:title>Room Operations Report</dc:title>",
          "<dc:creator>Room Operations Management System</dc:creator>",
          `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>`,
          "</cp:coreProperties>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "docProps/app.xml",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ',
          'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
          "<Application>Room Operations Management System</Application>",
          "</Properties>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ',
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
          "<sheets>",
          '<sheet name="Report" sheetId="1" r:id="rId1"/>',
          "</sheets>",
          "</workbook>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(
        [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
          "</Relationships>",
        ].join(""),
        "utf8",
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.from(buildSheetXml(columns, rows), "utf8"),
    },
  ];

  return createZip(files);
}

function escapePdfText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function splitPdfLine(value: string, maxLength = 96): string[] {
  const text = value.trim();

  if (text.length <= maxLength) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength) {
      if (current) {
        lines.push(current);
      }

      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildPdfLines(
  title: string,
  columns: ReportColumn[],
  rows: CsvRow[],
): string[] {
  const lines = [
    "Room Operations Management System",
    title,
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    `Total records: ${rows.length}`,
    "",
  ];

  if (rows.length === 0) {
    lines.push("No records found for the selected filters.");
    return lines;
  }

  rows.forEach((row, index) => {
    lines.push(`Record ${index + 1}`);

    for (const column of columns) {
      lines.push(
        ...splitPdfLine(`${column.label}: ${formatCellValue(column, row)}`),
      );
    }

    lines.push("");
  });

  return lines;
}

function buildPdfPageContent(lines: string[]): Buffer {
  const escapedLines = lines.map((line) => `(${escapePdfText(line)}) Tj T*`);

  const content = [
    "BT",
    "/F1 8 Tf",
    "40 800 Td",
    "12 TL",
    ...escapedLines,
    "ET",
  ].join("\n");

  return Buffer.from(content, "utf8");
}

function buildPdf(title: string, columns: ReportColumn[], rows: CsvRow[]): Buffer {
  const allLines = buildPdfLines(title, columns, rows);
  const linesPerPage = 60;
  const pages: string[][] = [];

  for (let index = 0; index < allLines.length; index += linesPerPage) {
    pages.push(allLines.slice(index, index + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push(["No records found."]);
  }

  const objects: Buffer[] = [];

  objects.push(Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"));

  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  objects.push(
    Buffer.from(
      `<< /Type /Pages /Kids [${pageObjectIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] /Count ${pages.length} >>`,
      "utf8",
    ),
  );

  objects.push(
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "utf8"),
  );

  for (const [index, pageLines] of pages.entries()) {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = buildPdfPageContent(pageLines);

    objects.push(
      Buffer.from(
        [
          "<< /Type /Page",
          "/Parent 2 0 R",
          "/MediaBox [0 0 595 842]",
          "/Resources << /Font << /F1 3 0 R >> >>",
          `/Contents ${contentObjectId} 0 R`,
          ">>",
        ].join(" "),
        "utf8",
      ),
    );

    objects.push(
      Buffer.concat([
        Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "utf8"),
        content,
        Buffer.from("\nendstream", "utf8"),
      ]),
    );
  }

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets: number[] = [0];
  let offset = chunks[0].length;

  for (const [index, object] of objects.entries()) {
    const objectNumber = index + 1;
    const objectChunk = Buffer.concat([
      Buffer.from(`${objectNumber} 0 obj\n`, "utf8"),
      object,
      Buffer.from("\nendobj\n", "utf8"),
    ]);

    offsets.push(offset);
    chunks.push(objectChunk);
    offset += objectChunk.length;
  }

  const xrefOffset = offset;

  const xrefRows = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((value) => `${String(value).padStart(10, "0")} 00000 n `),
  ];

  const trailer = [
    ...xrefRows,
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(Buffer.from(trailer, "utf8"));

  return Buffer.concat(chunks);
}

const occupancyColumns: ReportColumn[] = [
  { key: "camp_name", label: "Camp" },
  { key: "total_rooms", label: "Total Rooms" },
  { key: "occupied_rooms", label: "Occupied Rooms" },
  { key: "vacant_ready_rooms", label: "Vacant Ready Rooms" },
  { key: "reserved_rooms", label: "Reserved Rooms" },
  { key: "pending_checkout_rooms", label: "Pending Checkout Rooms" },
  { key: "unavailable_rooms", label: "Unavailable Rooms" },
  { key: "occupancy_rate", label: "Occupancy Rate", format: formatPercent },
];

const roomColumns: ReportColumn[] = [
  { key: "camp_name", label: "Camp" },
  { key: "building_name", label: "Building" },
  { key: "room_number", label: "Room Number" },
  { key: "room_type", label: "Room Type", format: formatStatus },
  { key: "current_status", label: "Room Status", format: formatStatus },
  { key: "condition_status", label: "Condition", format: formatStatus },
  { key: "capacity", label: "Capacity" },
  { key: "is_vip", label: "VIP Room", format: formatBoolean },
  {
    key: "is_delegate_suitable",
    label: "Delegate Suitable",
    format: formatBoolean,
  },
  { key: "current_guest_name", label: "Current Guest" },
  {
    key: "expected_departure_at",
    label: "Expected Departure",
    format: formatDateTime,
  },
];

const guestColumns: ReportColumn[] = [
  { key: "full_name", label: "Guest Name" },
  { key: "guest_category", label: "Category", format: formatStatus },
  { key: "organization", label: "Organization" },
  { key: "nationality", label: "Nationality" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  {
    key: "security_clearance_status",
    label: "Security Clearance",
    format: formatStatus,
  },
  { key: "created_at", label: "Created", format: formatDateTime },
];

const currentStayColumns: ReportColumn[] = [
  { key: "camp_name", label: "Camp" },
  { key: "room_number", label: "Room" },
  { key: "guest_name", label: "Guest" },
  { key: "guest_category", label: "Category", format: formatStatus },
  { key: "organization", label: "Organization" },
  { key: "is_vip", label: "VIP Guest", format: formatBoolean },
  { key: "stay_status", label: "Stay Status", format: formatStatus },
  { key: "arrival_time", label: "Arrival Time", format: formatDateTime },
  {
    key: "expected_departure_at",
    label: "Expected Departure",
    format: formatDateTime,
  },
  {
    key: "security_presence_status",
    label: "Security Presence",
    format: formatStatus,
  },
  {
    key: "security_entry_at",
    label: "Security Entry",
    format: formatDateTime,
  },
  {
    key: "security_exit_at",
    label: "Security Exit",
    format: formatDateTime,
  },
  {
    key: "security_last_seen_at",
    label: "Last Seen",
    format: formatDateTime,
  },
];

const exitedGuestColumns: ReportColumn[] = [
  { key: "room_number", label: "Previous Room" },
  { key: "guest_name", label: "Guest" },
  { key: "guest_category", label: "Category", format: formatStatus },
  { key: "organization", label: "Organization" },
  { key: "stay_status", label: "Stay Status", format: formatStatus },
  { key: "checked_in_at", label: "Checked In", format: formatDateTime },
  { key: "checked_out_at", label: "Checked Out", format: formatDateTime },
  { key: "security_exit_at", label: "Security Exit", format: formatDateTime },
  {
    key: "departure_or_exit_time",
    label: "Departure / Exit Time",
    format: formatDateTime,
  },
  { key: "exit_source", label: "Exit Source", format: formatStatus },
];

function applyCampFilter<QueryBuilder extends CampFilterQueryBuilder<QueryBuilder>>(
  query: QueryBuilder,
  campId: string | null,
): QueryBuilder {
  if (!campId) {
    return query;
  }

  return query.eq("camp_id", campId);
}

function applyDateRangeFilter<
  QueryBuilder extends DateRangeFilterQueryBuilder<QueryBuilder>,
>(
  query: QueryBuilder,
  column: string,
  dateFrom: string | null,
  dateTo: string | null,
): QueryBuilder {
  let nextQuery = query;

  if (dateFrom) {
    nextQuery = nextQuery.gte(column, dateFrom);
  }

  if (dateTo) {
    nextQuery = nextQuery.lte(column, dateTo);
  }

  return nextQuery;
}

async function buildOccupancyReport(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("current_occupancy_view")
    .select(
      [
        "camp_id",
        "camp_name",
        "total_rooms",
        "occupied_rooms",
        "vacant_ready_rooms",
        "reserved_rooms",
        "pending_checkout_rooms",
        "unavailable_rooms",
        "occupancy_rate",
      ].join(","),
    )
    .order("camp_name", { ascending: true });

  query = applyCampFilter(query, input.campId);

  const { data, error } = await query.returns<OccupancyReportRow[]>();

  if (error) {
    throw new Error(`Failed to build occupancy report: ${error.message}`);
  }

  const rows: CsvRow[] = (data ?? []).map((row) => ({
    camp_name: row.camp_name,
    total_rooms: row.total_rooms ?? 0,
    occupied_rooms: row.occupied_rooms ?? 0,
    vacant_ready_rooms: row.vacant_ready_rooms ?? 0,
    reserved_rooms: row.reserved_rooms ?? 0,
    pending_checkout_rooms: row.pending_checkout_rooms ?? 0,
    unavailable_rooms: row.unavailable_rooms ?? 0,
    occupancy_rate: row.occupancy_rate ?? 0,
  }));

  return {
    title: "Occupancy Report",
    filenameBase: reportFilenameBase(input.reportType),
    columns: occupancyColumns,
    rows,
    rowCount: rows.length,
  };
}

async function buildRoomsReport(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("room_board_view")
    .select(
      [
        "camp_id",
        "camp_name",
        "building_name",
        "room_number",
        "room_type",
        "current_status",
        "condition_status",
        "capacity",
        "is_vip",
        "is_delegate_suitable",
        "current_guest_name",
        "expected_departure_at",
      ].join(","),
    )
    .order("camp_name", { ascending: true })
    .order("building_name", { ascending: true })
    .order("room_number", { ascending: true });

  query = applyCampFilter(query, input.campId);

  const { data, error } = await query.returns<RoomBoardReportRow[]>();

  if (error) {
    throw new Error(`Failed to build rooms report: ${error.message}`);
  }

  const rows: CsvRow[] = (data ?? []).map((room) => ({
    camp_name: room.camp_name,
    building_name: room.building_name,
    room_number: room.room_number,
    room_type: room.room_type,
    current_status: room.current_status,
    condition_status: room.condition_status,
    capacity: room.capacity ?? 0,
    is_vip: room.is_vip ?? false,
    is_delegate_suitable: room.is_delegate_suitable ?? false,
    current_guest_name: room.current_guest_name,
    expected_departure_at: room.expected_departure_at,
  }));

  return {
    title: "Rooms Report",
    filenameBase: reportFilenameBase(input.reportType),
    columns: roomColumns,
    rows,
    rowCount: rows.length,
  };
}

async function buildGuestsReport(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("guests")
    .select(
      [
        "full_name",
        "guest_category",
        "organization",
        "nationality",
        "phone",
        "email",
        "security_clearance_status",
        "created_at",
      ].join(","),
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (input.campId) {
    query = query.eq("primary_camp_id", input.campId);
  }

  query = applyDateRangeFilter(
    query,
    "created_at",
    input.dateFrom,
    input.dateTo,
  );

  const { data, error } = await query.returns<GuestReportRow[]>();

  if (error) {
    throw new Error(`Failed to build guests report: ${error.message}`);
  }

  const rows: CsvRow[] = (data ?? []).map((guest) => ({
    full_name: guest.full_name,
    guest_category: guest.guest_category,
    organization: guest.organization,
    nationality: guest.nationality,
    phone: guest.phone,
    email: guest.email,
    security_clearance_status: guest.security_clearance_status,
    created_at: guest.created_at,
  }));

  return {
    title: "Guests Report",
    filenameBase: reportFilenameBase(input.reportType),
    columns: guestColumns,
    rows,
    rowCount: rows.length,
  };
}

async function buildCurrentStaysReport(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("manager_current_guests_view")
    .select(
      [
        "stay_id",
        "camp_id",
        "camp_name",
        "room_number",
        "guest_id",
        "guest_name",
        "guest_category",
        "organization",
        "is_vip",
        "stay_status",
        "arrival_time",
        "expected_departure_at",
        "security_presence_status",
        "security_entry_at",
        "security_exit_at",
        "security_last_seen_at",
      ].join(","),
    )
    .order("arrival_time", { ascending: false, nullsFirst: false });

  query = applyCampFilter(query, input.campId);
  query = applyDateRangeFilter(
    query,
    "arrival_time",
    input.dateFrom,
    input.dateTo,
  );

  const { data, error } = await query.returns<CurrentStayReportRow[]>();

  if (error) {
    throw new Error(`Failed to build current stays report: ${error.message}`);
  }

  const rows: CsvRow[] = (data ?? []).map((stay) => ({
    camp_name: stay.camp_name,
    room_number: stay.room_number,
    guest_name: stay.guest_name,
    guest_category: stay.guest_category,
    organization: stay.organization,
    is_vip: stay.is_vip ?? false,
    stay_status: stay.stay_status,
    arrival_time: stay.arrival_time,
    expected_departure_at: stay.expected_departure_at,
    security_presence_status: stay.security_presence_status,
    security_entry_at: stay.security_entry_at,
    security_exit_at: stay.security_exit_at,
    security_last_seen_at: stay.security_last_seen_at,
  }));

  return {
    title: "Current Stays Report",
    filenameBase: reportFilenameBase(input.reportType),
    columns: currentStayColumns,
    rows,
    rowCount: rows.length,
  };
}

async function buildExitedGuestsReport(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("manager_exited_guests_view")
    .select(
      [
        "stay_id",
        "camp_id",
        "guest_id",
        "guest_name",
        "guest_category",
        "organization",
        "room_number",
        "stay_status",
        "checked_in_at",
        "checked_out_at",
        "security_exit_at",
        "departure_or_exit_time",
        "exit_source",
      ].join(","),
    )
    .order("departure_or_exit_time", {
      ascending: false,
      nullsFirst: false,
    });

  query = applyCampFilter(query, input.campId);
  query = applyDateRangeFilter(
    query,
    "departure_or_exit_time",
    input.dateFrom,
    input.dateTo,
  );

  const { data, error } = await query.returns<ExitedGuestReportRow[]>();

  if (error) {
    throw new Error(`Failed to build exited guests report: ${error.message}`);
  }

  const rows: CsvRow[] = (data ?? []).map((guest) => ({
    room_number: guest.room_number,
    guest_name: guest.guest_name,
    guest_category: guest.guest_category,
    organization: guest.organization,
    stay_status: guest.stay_status,
    checked_in_at: guest.checked_in_at,
    checked_out_at: guest.checked_out_at,
    security_exit_at: guest.security_exit_at,
    departure_or_exit_time: guest.departure_or_exit_time,
    exit_source: guest.exit_source,
  }));

  return {
    title: "Exited Guests Report",
    filenameBase: reportFilenameBase(input.reportType),
    columns: exitedGuestColumns,
    rows,
    rowCount: rows.length,
  };
}

async function buildReportRows(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  switch (input.reportType) {
    case "occupancy":
      return buildOccupancyReport(input);

    case "rooms":
      return buildRoomsReport(input);

    case "guests":
      return buildGuestsReport(input);

    case "current_stays":
      return buildCurrentStaysReport(input);

    case "exited_guests":
      return buildExitedGuestsReport(input);

    default: {
      const exhaustiveCheck: never = input.reportType;
      throw new Error(`Unsupported report type: ${String(exhaustiveCheck)}`);
    }
  }
}

export async function buildReportExportCsv(
  input: CreateReportExportInput,
): Promise<CsvExportResult> {
  const report = await buildReportRows(input);

  return {
    filename: reportFilename(input.reportType, "csv"),
    csv: toCsv(report.columns, report.rows),
    rowCount: report.rowCount,
  };
}

export async function buildReportExportFile(
  input: CreateReportExportInput,
): Promise<ReportExportFileResult> {
  const format = normalizeExportFormat(input.exportFormat);
  const report = await buildReportRows(input);

  if (format === "csv") {
  return {
    filename: reportFilename(input.reportType, format),
    contentType: EXPORT_CONTENT_TYPES[format],
    body: Buffer.from(`\uFEFF${toCsv(report.columns, report.rows)}`, "utf8"),
    rowCount: report.rowCount,
  };
}

  if (format === "xlsx") {
    return {
      filename: reportFilename(input.reportType, format),
      contentType: EXPORT_CONTENT_TYPES[format],
      body: buildXlsx(report.columns, report.rows),
      rowCount: report.rowCount,
    };
  }

  return {
    filename: reportFilename(input.reportType, format),
    contentType: EXPORT_CONTENT_TYPES[format],
    body: buildPdf(report.title, report.columns, report.rows),
    rowCount: report.rowCount,
  };
}
