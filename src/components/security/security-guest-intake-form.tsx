import {
  createReturningSecurityVisitAction,
  createSecurityGuestAction,
} from "@/lib/actions/security/create-security-guest";
import { ProfilePhotoField } from "@/components/guests/profile-photo-field";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type CampOption = {
  id: string;
  name: string;
  code: string;
  location: string | null;
};

type ExistingGuestOption = {
  id: string;
  fullName: string;
  primaryCampId: string;
  organization: string | null;
  phone: string | null;
  idOrPassportNumber: string | null;
};

type SecurityGuestIntakeFormProps = {
  camps: CampOption[];
  guests: ExistingGuestOption[];
};

const guestCategoryOptions = [
  { value: "visitor", label: "Visitor" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant" },
  { value: "company_staff", label: "Company staff" },
  { value: "government_official", label: "Government official" },
  { value: "eu_delegate", label: "EU delegate" },
  { value: "american_delegate", label: "American delegate" },
  { value: "transit_guest", label: "Transit guest" },
  { value: "vip_guest", label: "VIP guest" },
  { value: "long_stay_guest", label: "Long-stay guest" },
] as const;

const genderOptions = [
  { value: "", label: "Not recorded" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "undisclosed", label: "Undisclosed" },
] as const;

function formatCampLabel(camp: CampOption): string {
  const location = camp.location?.trim();

  return `${camp.name} (${camp.code})${location ? ` - ${location}` : ""}`;
}

function formatGuestLabel(guest: ExistingGuestOption): string {
  const details = [
    guest.organization,
    guest.phone,
    guest.idOrPassportNumber ? `ID ${guest.idOrPassportNumber}` : null,
  ].filter((value): value is string => Boolean(value));

  return details.length > 0
    ? `${guest.fullName} (${details.join(" - ")})`
    : guest.fullName;
}

export function SecurityGuestIntakeForm({
  camps,
  guests,
}: SecurityGuestIntakeFormProps): React.JSX.Element {
  const hasCamps = camps.length > 0;
  const hasGuests = guests.length > 0;

  const campOptions = camps.map((camp) => ({
    value: camp.id,
    label: formatCampLabel(camp),
  }));

  const guestOptions = guests.map((guest) => ({
    value: guest.id,
    label: formatGuestLabel(guest),
  }));

  return (
    <div className="space-y-6">
      <form action={createReturningSecurityVisitAction} className="space-y-5">
        <div className="border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">
            Returning guest
          </p>

          <p className="mt-1 text-xs leading-5 text-muted">
            Select an existing guest and start a new security visit.
          </p>
        </div>

        <div className="form-grid">
          <Select
            label="Camp"
            id="returningCampId"
            name="campId"
            required
            defaultValue=""
            placeholder="Select camp"
            options={campOptions}
            disabled={!hasCamps || !hasGuests}
          />

          <Select
            label="Existing guest"
            id="returningGuestId"
            name="guestId"
            required
            defaultValue=""
            placeholder="Select guest"
            options={guestOptions}
            disabled={!hasCamps || !hasGuests}
          />

          <Textarea
            wrapperClassName="md:col-span-2"
            label="Security notes"
            id="returningNotes"
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Visit context, document observations, or gate notes..."
            className="min-h-24 resize-y"
          />
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <PendingSubmitButton
            pendingLabel="Starting visit..."
            disabled={!hasCamps || !hasGuests}
          >
            Start visit
          </PendingSubmitButton>
        </div>
      </form>

      <form action={createSecurityGuestAction} className="space-y-5">
        <div className="border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">New guest</p>

          <p className="mt-1 text-xs leading-5 text-muted">
            Create a guest record only when the guest is not already registered.
          </p>
        </div>

        <div className="form-grid">
          <ProfilePhotoField className="md:col-span-2" required />

          <Select
            label="Camp"
            id="primaryCampId"
            name="primaryCampId"
            required
            defaultValue=""
            placeholder="Select camp"
            options={campOptions}
            disabled={!hasCamps}
          />

          <Select
            label="Guest category"
            id="guestCategory"
            name="guestCategory"
            required
            defaultValue="visitor"
            options={guestCategoryOptions}
          />

          <Input
            label="Full name"
            id="fullName"
            name="fullName"
            required
            maxLength={160}
            placeholder="Guest full name"
          />

          <Input
            label="ID / passport number"
            id="idOrPassportNumber"
            name="idOrPassportNumber"
            maxLength={120}
            placeholder="Optional but recommended"
          />

          <Input
            label="Phone"
            id="phone"
            name="phone"
            type="tel"
            maxLength={60}
            placeholder="+256..."
          />

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            maxLength={180}
            placeholder="guest@example.com"
          />

          <Input
            label="Nationality"
            id="nationality"
            name="nationality"
            maxLength={100}
            placeholder="Nationality"
          />

          <Select
            label="Gender"
            id="gender"
            name="gender"
            defaultValue=""
            options={genderOptions}
          />

          <Input
            label="Organization"
            id="organization"
            name="organization"
            maxLength={180}
            placeholder="Company, agency, organization..."
          />

          <Input
            label="Department / project"
            id="departmentOrProject"
            name="departmentOrProject"
            maxLength={180}
            placeholder="Department, project, or unit"
          />

          <Textarea
            wrapperClassName="md:col-span-2"
            label="Security notes"
            id="notes"
            name="notes"
            rows={4}
            maxLength={1000}
            placeholder="Initial security notes, document observations, or intake context..."
            className="min-h-28 resize-y"
          />
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <PendingSubmitButton
            pendingLabel="Creating guest..."
            disabled={!hasCamps}
          >
            Create guest
          </PendingSubmitButton>
        </div>
      </form>
    </div>
  );
}
