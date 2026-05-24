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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="border-b border-border px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function GuestForm({ camps, guest }: GuestFormProps): React.JSX.Element {
  const isEditing = Boolean(guest);

  const campOptions = camps.map((camp) => ({
    value: camp.id,
    label: `${camp.name} (${camp.code})`,
  }));

  return (
    <form
      action={isEditing ? updateGuestAction : createGuestAction}
      className="border border-border bg-surface"
    >
      {guest ? <input type="hidden" name="guestId" value={guest.id} /> : null}

      <SectionHeader
        title={isEditing ? "Edit guest profile" : "Create guest profile"}
        description="Maintain the guest identity, camp assignment, contact details, clearance state, and internal notes used by reception and security."
      />

      <div className="divide-y divide-border">
        <section className="px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Identity
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              id="idOrPassportNumber"
              name="idOrPassportNumber"
              label="ID / passport number"
              defaultValue={guest?.id_or_passport_number ?? ""}
              placeholder="Stored privately"
            />
          </div>
        </section>

        <section className="px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Camp and handling
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              id="securityClearanceStatus"
              name="securityClearanceStatus"
              label="Security clearance"
              defaultValue={guest?.security_clearance_status ?? ""}
              options={clearanceOptions}
            />

            <label className="border border-border bg-muted/30 px-4 py-3">
              <span className="flex items-start gap-3">
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

                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Mark for priority handling and operational visibility.
                  </span>
                </span>
              </span>
            </label>
          </div>

          {campOptions.length === 0 ? (
            <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              No writable camp is available for this user. Guest records cannot
              be saved until camp access is assigned.
            </p>
          ) : null}
        </section>

        <section className="px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Contact and organization
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </section>

        <section className="px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Emergency contact
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </section>

        <section className="px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Operational notes
            </p>
          </div>

          <div className="grid gap-4">
            <Textarea
              id="notes"
              name="notes"
              label="Reception notes"
              rows={4}
              maxLength={1000}
              defaultValue={guest?.notes ?? ""}
              placeholder="Operational notes only"
              className="resize-y"
            />

            <Textarea
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
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs leading-5 text-muted-foreground">
          Changes affect reception, security, allocation, and stay workflows.
        </p>

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
