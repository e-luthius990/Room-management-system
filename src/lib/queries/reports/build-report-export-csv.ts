import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CreateReportExportInput,
  ExportFormat,
  ReportType,
} from "@/lib/validation/reports";

type CsvRow = Record<string, unknown>;

type ReportRowsResult = {
  filenameBase: string;
  headers: string[];
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

type RoomBoardReportRow = {
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

type MaintenanceReportRow = {
  issue_type: string | null;
  priority: string | null;
  status: string | null;
  is_room_blocking: boolean | null;
  created_at: string | null;
  started_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
};

type TaskReportRow = {
  task_type: string | null;
  priority: string | null;
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

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

function toCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(","),
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

function formatTitleFromIssueType(issueType: string | null): string {
  if (!issueType) {
    return "Maintenance Issue";
  }

  return issueType
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function buildSheetXml(headers: string[], rows: CsvRow[]): string {
  const matrix = [
    headers,
    ...rows.map((row) => headers.map((header) => toText(row[header]))),
  ];

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

function buildXlsx(headers: string[], rows: CsvRow[]): Buffer {
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
          "<dc:creator>Room Management System</dc:creator>",
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
          "<Application>Room Management System</Application>",
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
      data: Buffer.from(buildSheetXml(headers, rows), "utf8"),
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

function splitPdfLine(value: string, maxLength = 105): string[] {
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
  filenameBase: string,
  headers: string[],
  rows: CsvRow[],
): string[] {
  const lines = [
    `Room Management System — ${filenameBase.replaceAll("-", " ")}`,
    `Generated at: ${new Date().toISOString()}`,
    `Rows: ${rows.length}`,
    "",
  ];

  for (const row of rows) {
    const line = headers
      .map((header) => `${header}: ${toText(row[header])}`)
      .join(" | ");

    lines.push(...splitPdfLine(line));
    lines.push("");
  }

  if (rows.length === 0) {
    lines.push("No records found for the selected filters.");
  }

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

function buildPdf(filenameBase: string, headers: string[], rows: CsvRow[]): Buffer {
  const allLines = buildPdfLines(filenameBase, headers, rows);
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

async function buildReportRows(
  input: CreateReportExportInput,
): Promise<ReportRowsResult> {
  const supabase = await createServerSupabaseClient();

  if (input.reportType === "occupancy" || input.reportType === "rooms") {
    let query = supabase
      .from("room_board_view")
      .select(
        [
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

    if (input.campId) {
      query = query.eq("camp_id", input.campId);
    }

    const { data, error } = await query.returns<RoomBoardReportRow[]>();

    if (error) {
      throw new Error(`Failed to build room report: ${error.message}`);
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

    const headers = [
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
    ];

    return {
      filenameBase: reportFilenameBase(input.reportType),
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  if (input.reportType === "guests") {
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

    if (input.dateFrom) {
      query = query.gte("created_at", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("created_at", input.dateTo);
    }

    const { data, error } = await query.returns<GuestReportRow[]>();

    if (error) {
      throw new Error(`Failed to build guests report: ${error.message}`);
    }

    const headers = [
      "full_name",
      "guest_category",
      "organization",
      "nationality",
      "phone",
      "email",
      "security_clearance_status",
      "created_at",
    ];

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
      filenameBase: reportFilenameBase(input.reportType),
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  if (input.reportType === "maintenance") {
    let query = supabase
      .from("maintenance_tickets")
      .select(
        [
          "issue_type",
          "priority",
          "status",
          "is_room_blocking",
          "created_at",
          "started_at",
          "resolved_at",
          "verified_at",
        ].join(","),
      )
      .order("created_at", { ascending: false });

    if (input.campId) {
      query = query.eq("camp_id", input.campId);
    }

    if (input.dateFrom) {
      query = query.gte("created_at", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("created_at", input.dateTo);
    }

    const { data, error } = await query.returns<MaintenanceReportRow[]>();

    if (error) {
      throw new Error(`Failed to build maintenance report: ${error.message}`);
    }

    const rows: CsvRow[] = (data ?? []).map((ticket) => ({
      title: formatTitleFromIssueType(ticket.issue_type),
      issue_type: ticket.issue_type,
      severity: ticket.priority,
      priority: ticket.priority,
      status: ticket.status,
      blocks_room: ticket.is_room_blocking ?? false,
      is_room_blocking: ticket.is_room_blocking ?? false,
      created_at: ticket.created_at,
      started_at: ticket.started_at,
      resolved_at: ticket.resolved_at,
      verified_at: ticket.verified_at,
    }));

    const headers = [
      "title",
      "issue_type",
      "severity",
      "priority",
      "status",
      "blocks_room",
      "is_room_blocking",
      "created_at",
      "started_at",
      "resolved_at",
      "verified_at",
    ];

    return {
      filenameBase: reportFilenameBase(input.reportType),
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  if (input.reportType === "housekeeping") {
    let query = supabase
      .from("housekeeping_tasks")
      .select("task_type,priority,status,created_at,started_at,completed_at")
      .order("created_at", { ascending: false });

    if (input.campId) {
      query = query.eq("camp_id", input.campId);
    }

    if (input.dateFrom) {
      query = query.gte("created_at", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("created_at", input.dateTo);
    }

    const { data, error } = await query.returns<TaskReportRow[]>();

    if (error) {
      throw new Error(`Failed to build housekeeping report: ${error.message}`);
    }

    const headers = [
      "task_type",
      "priority",
      "status",
      "created_at",
      "started_at",
      "completed_at",
    ];

    const rows: CsvRow[] = (data ?? []).map((task) => ({
      task_type: task.task_type,
      priority: task.priority,
      status: task.status,
      created_at: task.created_at,
      started_at: task.started_at,
      completed_at: task.completed_at,
    }));

    return {
      filenameBase: reportFilenameBase(input.reportType),
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  let query = supabase
    .from("room_service_tasks")
    .select("task_type,priority,status,created_at,started_at,completed_at")
    .order("created_at", { ascending: false });

  if (input.campId) {
    query = query.eq("camp_id", input.campId);
  }

  if (input.dateFrom) {
    query = query.gte("created_at", input.dateFrom);
  }

  if (input.dateTo) {
    query = query.lte("created_at", input.dateTo);
  }

  const { data, error } = await query.returns<TaskReportRow[]>();

  if (error) {
    throw new Error(`Failed to build room service report: ${error.message}`);
  }

  const headers = [
    "task_type",
    "priority",
    "status",
    "created_at",
    "started_at",
    "completed_at",
  ];

  const rows: CsvRow[] = (data ?? []).map((task) => ({
    task_type: task.task_type,
    priority: task.priority,
    status: task.status,
    created_at: task.created_at,
    started_at: task.started_at,
    completed_at: task.completed_at,
  }));

  return {
    filenameBase: reportFilenameBase(input.reportType),
    headers,
    rows,
    rowCount: rows.length,
  };
}

export async function buildReportExportCsv(
  input: CreateReportExportInput,
): Promise<CsvExportResult> {
  const report = await buildReportRows(input);

  return {
    filename: reportFilename(input.reportType, "csv"),
    csv: toCsv(report.headers, report.rows),
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
      body: Buffer.from(toCsv(report.headers, report.rows), "utf8"),
      rowCount: report.rowCount,
    };
  }

  if (format === "xlsx") {
    return {
      filename: reportFilename(input.reportType, format),
      contentType: EXPORT_CONTENT_TYPES[format],
      body: buildXlsx(report.headers, report.rows),
      rowCount: report.rowCount,
    };
  }

  return {
    filename: reportFilename(input.reportType, format),
    contentType: EXPORT_CONTENT_TYPES[format],
    body: buildPdf(report.filenameBase, report.headers, report.rows),
    rowCount: report.rowCount,
  };
}