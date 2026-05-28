import type { CampOption } from "@/lib/queries/setup/options";
import { createImportBatchAction } from "@/lib/actions/imports/create-import";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type CreateImportFormProps = {
  camps: CampOption[];
};

const importTypeOptions = [
  { value: "rooms_csv", label: "Rooms CSV" },
  { value: "guests_csv", label: "Guests CSV" },
] as const;

export function CreateImportForm({
  camps,
}: CreateImportFormProps): React.JSX.Element {
  const campOptions = camps.map((camp) => ({
    value: camp.id,
    label: `${camp.name} (${camp.code})`,
  }));

  return (
    <form
      action={createImportBatchAction}
      className="surface-card p-5 sm:p-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Select
          label="Camp"
          id="campId"
          name="campId"
          required
          defaultValue=""
          placeholder="Select camp"
          disabled={campOptions.length === 0}
          options={campOptions}
        />

        <Select
          label="Import type"
          id="importType"
          name="importType"
          required
          defaultValue="rooms_csv"
          options={importTypeOptions}
        />

        <div className="field-group md:col-span-2">
          <label htmlFor="file" className="field-label">
            CSV file
          </label>

          <input
            id="file"
            required
            name="file"
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="input file:mr-4 file:rounded-xl file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground"
          />

          <p className="field-hint">
            CSV only. Maximum 20MB and 5,000 data rows per upload.
          </p>
        </div>

        <Textarea
          wrapperClassName="md:col-span-2"
          id="notes"
          name="notes"
          label="Notes"
          rows={3}
          maxLength={500}
          placeholder="Optional internal note about this import"
          className="resize-y"
        />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="muted-panel">
          <div className="text-sm font-semibold text-foreground">
            Rooms CSV required columns
          </div>

          <p className="mt-2 text-xs leading-5 text-foreground-soft">
            building_name, room_number, room_type, capacity
          </p>

          <p className="mt-2 text-xs leading-5 text-muted">
            Optional: floor_label, section_label, bed_type, gender_restriction,
            is_vip, is_delegate_suitable, notes.
          </p>
        </div>

        <div className="muted-panel">
          <div className="text-sm font-semibold text-foreground">
            Guests CSV required columns
          </div>

          <p className="mt-2 text-xs leading-5 text-foreground-soft">
            full_name, guest_category
          </p>

          <p className="mt-2 text-xs leading-5 text-muted">
            At least one contact field is required per row: phone or email.
            Optional: gender, organization, department_or_project, nationality,
            is_vip, security_clearance_status, notes, manager_notes.
          </p>
        </div>
      </section>

      <div className="form-actions mt-6">
        <PendingSubmitButton
          pendingLabel="Uploading import..."
          disabled={campOptions.length === 0}
        >
          Upload and validate import
        </PendingSubmitButton>
      </div>
    </form>
  );
}
