import { createSecurityGuestAction } from "@/lib/actions/security/create-security-guest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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

type SecurityGuestIntakeFormProps = {
  camps: CampOption[];
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

export function SecurityGuestIntakeForm({
  camps,
}: SecurityGuestIntakeFormProps): React.JSX.Element {
  return (
    <form action={createSecurityGuestAction}>
      <Card variant="card">
        <CardHeader>
          <div className="page-kicker">Security intake</div>

          <CardTitle>Register visitor or gate guest</CardTitle>

          <CardDescription>
            Create a limited guest record for security clearance and gate
            movement. Reception remains responsible for reservations,
            allocations, and check-in.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Camp"
              id="primaryCampId"
              name="primaryCampId"
              required
              defaultValue=""
              placeholder="Select camp"
              options={camps.map((camp) => ({
                value: camp.id,
                label: `${camp.name} (${camp.code})${
                  camp.location ? ` · ${camp.location}` : ""
                }`,
              }))}
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
              placeholder="Company, agency, delegation..."
            />

            <Input
              label="Department / project"
              id="departmentOrProject"
              name="departmentOrProject"
              maxLength={180}
              placeholder="Host department, project, or purpose group"
            />
          </div>

          <Textarea
            label="Security intake notes"
            id="notes"
            name="notes"
            rows={4}
            maxLength={1500}
            placeholder="Optional. Record useful gate intake context before clearance."
            className="resize-y"
          />

          <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
            <input type="checkbox" name="isVip" className="checkbox mt-1" />

            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Mark as VIP
              </span>

              <span className="mt-1 block text-xs leading-5 text-muted">
                VIP guests should receive heightened attention during clearance
                and reception handoff.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-muted">
              The guest will be created with pending security clearance. Open
              the profile next to approve, deny, or record gate entry.
            </p>

            <PendingSubmitButton pendingLabel="Registering guest...">
              Register and review
            </PendingSubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
