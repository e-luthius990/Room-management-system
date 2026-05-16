import type { CampOption } from "@/lib/queries/setup/options";
import type { GuestProfile } from "@/lib/queries/guests/get-guest-profile";
import { createGuestAction } from "@/lib/actions/guests/create-guest";
import { updateGuestAction } from "@/lib/actions/guests/update-guest";

type GuestFormProps = {
  camps: CampOption[];
  guest?: GuestProfile;
};

const categories = [
  { value: "eu_delegate", label: "EU delegate" },
  { value: "american_delegate", label: "American delegate" },
  { value: "government_official", label: "Government official" },
  { value: "company_staff", label: "Company staff" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant" },
  { value: "visitor", label: "Visitor" },
  { value: "transit_guest", label: "Transit guest" },
  { value: "vip_guest", label: "VIP guest" },
  { value: "long_stay_guest", label: "Long-stay guest" },
] as const;

const genderOptions = [
  { value: "", label: "Not selected" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "undisclosed", label: "Undisclosed" },
] as const;

const clearanceOptions = [
  { value: "", label: "Not selected" },
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "not_required", label: "Not required" },
] as const;

export function GuestForm({ camps, guest }: GuestFormProps): React.JSX.Element {
  const isEditing = Boolean(guest);

  return (
    <form
      action={isEditing ? updateGuestAction : createGuestAction}
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      {guest ? <input type="hidden" name="guestId" value={guest.id} /> : null}

      <div>
        <h2 className="text-base font-semibold text-neutral-950">
          {isEditing ? "Edit guest" : "Create guest"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Keep guest identity, camp access, and operational notes accurate.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Full name
          </label>
          <input
            id="fullName"
            required
            name="fullName"
            defaultValue={guest?.full_name ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Guest full name"
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="primaryCampId"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Primary camp
          </label>
          <select
            id="primaryCampId"
            required
            name="primaryCampId"
            defaultValue={guest?.primary_camp_id ?? ""}
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
            htmlFor="guestCategory"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Guest category
          </label>
          <select
            id="guestCategory"
            required
            name="guestCategory"
            defaultValue={guest?.guest_category ?? "visitor"}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="gender"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={guest?.gender ?? ""}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {genderOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="nationality"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Nationality
          </label>
          <input
            id="nationality"
            name="nationality"
            defaultValue={guest?.nationality ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Nationality"
          />
        </div>

        <div>
          <label
            htmlFor="organizationName"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Organization
          </label>
          <input
            id="organizationName"
            name="organizationName"
            defaultValue={guest?.organization_name ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Company, agency, delegation..."
          />
        </div>

        <div>
          <label
            htmlFor="departmentOrProject"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Department or project
          </label>
          <input
            id="departmentOrProject"
            name="departmentOrProject"
            defaultValue={guest?.department_or_project ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Department, mission, or project"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={guest?.phone ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="+256..."
            autoComplete="tel"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={guest?.email ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="guest@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="idOrPassportNumber"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            ID / passport number
          </label>
          <input
            id="idOrPassportNumber"
            name="idOrPassportNumber"
            defaultValue={guest?.id_or_passport_number ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Stored privately"
          />
        </div>

        <div>
          <label
            htmlFor="securityClearanceStatus"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Security clearance
          </label>
          <select
            id="securityClearanceStatus"
            name="securityClearanceStatus"
            defaultValue={guest?.security_clearance_status ?? ""}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {clearanceOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="emergencyContactName"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Emergency contact name
          </label>
          <input
            id="emergencyContactName"
            name="emergencyContactName"
            defaultValue={guest?.emergency_contact_name ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="emergencyContactPhone"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Emergency contact phone
          </label>
          <input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            defaultValue={guest?.emergency_contact_phone ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            autoComplete="off"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <input
              name="isVip"
              type="checkbox"
              defaultChecked={guest?.is_vip ?? false}
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                VIP guest
              </span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                Mark this guest for priority handling, preparation, and
                operational visibility.
              </span>
            </span>
          </label>
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
            rows={4}
            maxLength={1000}
            defaultValue={guest?.notes ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Operational notes only"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="managerNotes"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Manager notes
          </label>
          <textarea
            id="managerNotes"
            name="managerNotes"
            rows={4}
            maxLength={1000}
            defaultValue={guest?.manager_notes ?? ""}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Internal notes for managers"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          {isEditing ? "Save guest" : "Create guest"}
        </button>
      </div>
    </form>
  );
}
