import type { CampOption } from "@/lib/queries/setup/options";
import { createReportExportAction } from "@/lib/actions/reports/create-export";
import type { ExportFormat, ReportType } from "@/lib/validation/reports";

type CreateExportFormProps = {
  camps: CampOption[];
};

type ReportOption = {
  value: ReportType;
  label: string;
  description: string;
};

type FormatOption = {
  value: ExportFormat;
  label: string;
  description: string;
};

const reportOptions: ReportOption[] = [
  {
    value: "occupancy",
    label: "Occupancy",
    description:
      "Room occupancy, guest, housekeeping, and maintenance context.",
  },
  {
    value: "guests",
    label: "Guests",
    description: "Guest records created within the selected date range.",
  },
  {
    value: "rooms",
    label: "Rooms",
    description: "Room inventory, status, condition, and operational state.",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Maintenance tickets and repair workflow history.",
  },
  {
    value: "housekeeping",
    label: "Housekeeping",
    description: "Housekeeping task workflow history.",
  },
  {
    value: "room_service",
    label: "Room Service",
    description: "Room service task workflow history.",
  },
];

const formatOptions: FormatOption[] = [
  {
    value: "csv",
    label: "CSV",
    description: "Best for spreadsheets, imports, and raw operational data.",
  },
  {
    value: "xlsx",
    label: "Excel",
    description: "Best for managers who want a ready spreadsheet file.",
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Best for review, sharing, and printable summaries.",
  },
];

export function CreateExportForm({
  camps,
}: CreateExportFormProps): React.JSX.Element {
  return (
    <form
      action={createReportExportAction}
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-neutral-950">
          Generate report export
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Choose a report, select the file format, optionally limit it to a
          camp, and apply a date range where supported.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="reportType"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Report type
          </label>

          <select
            id="reportType"
            required
            name="reportType"
            defaultValue="occupancy"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {reportOptions.map((report) => (
              <option key={report.value} value={report.value}>
                {report.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Occupancy and rooms exports use the live room board snapshot.
          </p>
        </div>

        <div>
          <label
            htmlFor="exportFormat"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Format
          </label>

          <select
            id="exportFormat"
            required
            name="exportFormat"
            defaultValue="csv"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {formatOptions.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            CSV, Excel, and PDF exports are stored in the private exports
            bucket.
          </p>
        </div>

        <div>
          <label
            htmlFor="campId"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Camp
          </label>

          <select
            id="campId"
            name="campId"
            defaultValue=""
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="">All accessible camps</option>

            {camps.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.name} ({camp.code})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:block" aria-hidden="true" />

        <div>
          <label
            htmlFor="dateFrom"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            From
          </label>

          <input
            id="dateFrom"
            name="dateFrom"
            type="date"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          />
        </div>

        <div>
          <label
            htmlFor="dateTo"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            To
          </label>

          <input
            id="dateTo"
            name="dateTo"
            type="date"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          />
        </div>

        <div className="md:col-span-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
          Date filters apply to guests, maintenance, housekeeping, and room
          service exports. Occupancy and rooms exports are generated from the
          current room board snapshot.
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Generate export
        </button>
      </div>
    </form>
  );
}
