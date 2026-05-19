import type { CampOption } from "@/lib/queries/setup/options";
import type { GuestProfile } from "@/lib/queries/guests/get-guest-profile";
import { createGuestAction } from "@/lib/actions/guests/create-guest";
import { updateGuestAction } from "@/lib/actions/guests/update-guest";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type GuestFormProps = {
  camps: CampOption[];
  guest?: GuestProfile;
};

const guestCategoryOptions = [
  { value: "eu_delegate", label: "EU Delegate" },
  { value: "american_delegate", label: "American Delegate" },
  { value: "government_official", label: "Government Official" },
  { value: "company_staff", label: "Company Staff" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant" },
  { value: "visitor", label: "Visitor" },
  { value: "transit_guest", label: "Transit Guest" },
  { value: "vip_guest", label: "VIP Guest" },
  { value: "long_stay_guest", label: "Long-Stay Guest" },
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

  const campOptions = camps.map((camp) => ({
    value: camp.id,
    label: `${camp.name} (${camp.code})`,
  }));

  return (
    <form
      action={isEditing ? updateGuestAction : createGuestAction}
      className="surface-card p-5 sm:p-6"
    >
      {guest ? <input type="hidden" name="guestId" value={guest.id} /> : null}

      <div>
        <div className="page-kicker">Guest profile</div>

        <h2 className="mt-2 text-base font-semibold tracking-[-0.025em] text-foreground">
          {isEditing ? "Edit guest" : "Create guest"}
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted">
          Keep guest identity, camp assignment, contact details, and operational
          notes accurate.
        </p>
      </div>

      <div className="mt-6 form-grid">
        <Input
          wrapperClassName="md:col-span-2"
          id="fullName"
          name="fullName"
          label="Full name"
          required
          defaultValue={guest?.full_name ?? ""}
          placeholder="Guest full name"
          autoComplete="name"
        />

        <Select
          id="primaryCampId"
          name="primaryCampId"
          label="Primary camp"
          required
          defaultValue={guest?.primary_camp_id ?? ""}
          placeholder="Select camp"
          disabled={campOptions.length === 0}
          options={campOptions}
        />

        <Select
          id="guestCategory"
          name="guestCategory"
          label="Guest category"
          required
          defaultValue={guest?.guest_category ?? "visitor"}
          options={guestCategoryOptions}
        />

        <Select
          id="gender"
          name="gender"
          label="Gender"
          defaultValue={guest?.gender ?? ""}
          options={genderOptions}
        />

        <Input
          id="nationality"
          name="nationality"
          label="Nationality"
          defaultValue={guest?.nationality ?? ""}
          placeholder="Nationality"
        />

        <Input
          id="organizationName"
          name="organizationName"
          label="Organization"
          defaultValue={guest?.organization_name ?? ""}
          placeholder="Company, agency, delegation..."
        />

        <Input
          id="departmentOrProject"
          name="departmentOrProject"
          label="Department or project"
          defaultValue={guest?.department_or_project ?? ""}
          placeholder="Department, mission, or project"
        />

        <Input
          id="phone"
          name="phone"
          label="Phone"
          defaultValue={guest?.phone ?? ""}
          placeholder="+256..."
          autoComplete="tel"
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          defaultValue={guest?.email ?? ""}
          placeholder="guest@example.com"
          autoComplete="email"
        />

        <Input
          id="idOrPassportNumber"
          name="idOrPassportNumber"
          label="ID / passport number"
          defaultValue={guest?.id_or_passport_number ?? ""}
          placeholder="Stored privately"
        />

        <Select
          id="securityClearanceStatus"
          name="securityClearanceStatus"
          label="Security clearance"
          defaultValue={guest?.security_clearance_status ?? ""}
          options={clearanceOptions}
        />

        <Input
          id="emergencyContactName"
          name="emergencyContactName"
          label="Emergency contact name"
          defaultValue={guest?.emergency_contact_name ?? ""}
          autoComplete="off"
        />

        <Input
          id="emergencyContactPhone"
          name="emergencyContactPhone"
          label="Emergency contact phone"
          defaultValue={guest?.emergency_contact_phone ?? ""}
          autoComplete="off"
        />

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 md:col-span-2">
          <input
            name="isVip"
            type="checkbox"
            defaultChecked={guest?.is_vip ?? false}
            className="checkbox mt-1"
          />

          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              VIP guest
            </span>

            <span className="mt-1 block text-xs leading-5 text-muted">
              Mark this guest for priority handling and operational visibility.
            </span>
          </span>
        </label>

        <Textarea
          wrapperClassName="md:col-span-2"
          id="notes"
          name="notes"
          label="Notes"
          rows={4}
          maxLength={1000}
          defaultValue={guest?.notes ?? ""}
          placeholder="Operational notes only"
          className="resize-y"
        />

        <Textarea
          wrapperClassName="md:col-span-2"
          id="managerNotes"
          name="managerNotes"
          label="Manager notes"
          rows={4}
          maxLength={1000}
          defaultValue={guest?.manager_notes ?? ""}
          placeholder="Internal notes for managers"
          className="resize-y"
        />
      </div>

      <div className="form-actions mt-6">
        <PendingSubmitButton
          pendingLabel={isEditing ? "Saving guest..." : "Creating guest..."}
          disabled={campOptions.length === 0}
        >
          {isEditing ? "Save guest" : "Create guest"}
        </PendingSubmitButton>
      </div>
    </form>
  );
}
