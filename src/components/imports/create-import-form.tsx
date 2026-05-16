import type { CampOption } from "@/lib/queries/setup/options";
import { createImportBatchAction } from "@/lib/actions/imports/create-import";

type CreateImportFormProps = {
  camps: CampOption[];
};

export function CreateImportForm({
  camps,
}: CreateImportFormProps): React.JSX.Element {
  return (
    <form
      action={createImportBatchAction}
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-neutral-950">
          Upload import file
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Upload a CSV file to validate rows before applying them into rooms or
          guests.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="campId"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Camp
          </label>

          <select
            id="campId"
            required
            name="campId"
            defaultValue=""
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="" disabled>
              Select camp
            </option>

            {camps.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.name} ({camp.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="importType"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Import type
          </label>

          <select
            id="importType"
            required
            name="importType"
            defaultValue="rooms_csv"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="rooms_csv">Rooms CSV</option>
            <option value="guests_csv">Guests CSV</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="file"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            CSV file
          </label>

          <input
            id="file"
            required
            name="file"
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            CSV only. Maximum 20MB and 5,000 data rows per upload.
          </p>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Optional internal note about this import"
          />
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-950">
            Rooms CSV required columns
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-600">
            building_name, room_number, room_type, capacity
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Optional: floor_label, section_label, bed_type, gender_restriction,
            is_vip, is_delegate_suitable, notes.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-950">
            Guests CSV required columns
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-600">
            full_name, guest_category
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            At least one contact field is required per row: phone or email.
            Optional: gender, organization, department_or_project, nationality,
            is_vip, security_clearance_status, notes, manager_notes.
          </p>
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Upload and validate import
        </button>
      </div>
    </form>
  );
}
