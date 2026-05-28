"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createExpectedArrivalAction,
  createExpectedArrivalWithGuestAction,
  type ExpectedArrivalActionState,
} from "@/lib/actions/expected-arrivals";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type CampOption = {
  id: string;
  name: string;
};

type GuestOption = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  phone: string | null;
  email: string | null;
  organization: string | null;
};

type ExpectedArrivalFormProps = {
  camps: CampOption[];
  guests: GuestOption[];
};

type GuestMode = "existing" | "new";

const INITIAL_STATE: ExpectedArrivalActionState = {
  ok: false,
};

const EXPECTED_ARRIVALS_ROUTE = "/reception/expected-arrivals";

const GUEST_CATEGORY_OPTIONS = [
  { value: "eu_delegate", label: "EU Delegate" },
  { value: "american_delegate", label: "American Delegate" },
  { value: "government_official", label: "Government Official" },
  { value: "company_staff", label: "Company Staff" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant" },
  { value: "visitor", label: "Visitor" },
  { value: "transit_guest", label: "Transit Guest" },
  { value: "vip_guest", label: "VIP Guest" },
  { value: "long_stay_guest", label: "Long-stay Guest" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "undisclosed", label: "Undisclosed" },
];

function getFieldError(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function compactJoin(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function formatGuestLabel(guest: GuestOption): string {
  const meta = compactJoin([guest.organization, guest.phone, guest.email]);

  return meta ? `${guest.full_name} — ${meta}` : guest.full_name;
}

function formatModeLabel(mode: GuestMode): string {
  return mode === "existing" ? "Existing guest" : "New guest";
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-5 text-foreground">
        {value}
      </dd>
    </div>
  );
}

function ModeToggle({
  value,
  disabled,
  onChange,
}: {
  value: GuestMode;
  disabled: boolean;
  onChange: (value: GuestMode) => void;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface-2 p-1">
      {(["existing", "new"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60",
            value === mode
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:bg-surface/70 hover:text-foreground",
          )}
          aria-pressed={value === mode}
        >
          {formatModeLabel(mode)}
        </button>
      ))}
    </div>
  );
}

export function ExpectedArrivalForm({
  camps,
  guests,
}: ExpectedArrivalFormProps): React.JSX.Element {
  const router = useRouter();

  const [mode, setMode] = useState<GuestMode>("existing");
  const [selectedCampId, setSelectedCampId] = useState(camps[0]?.id ?? "");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestCategory, setNewGuestCategory] = useState("visitor");

  const [existingState, existingFormAction, existingPending] = useActionState(
    createExpectedArrivalAction,
    INITIAL_STATE,
  );

  const [newGuestState, newGuestFormAction, newGuestPending] = useActionState(
    createExpectedArrivalWithGuestAction,
    INITIAL_STATE,
  );

  const isPending = existingPending || newGuestPending;
  const state = mode === "existing" ? existingState : newGuestState;
  const formAction =
    mode === "existing" ? existingFormAction : newGuestFormAction;

  const filteredGuests = useMemo(() => {
    if (!selectedCampId) {
      return guests;
    }

    return guests.filter((guest) => guest.primary_camp_id === selectedCampId);
  }, [guests, selectedCampId]);

  const selectedCamp = useMemo(
    () => camps.find((camp) => camp.id === selectedCampId) ?? null,
    [camps, selectedCampId],
  );

  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.id === selectedGuestId) ?? null,
    [guests, selectedGuestId],
  );

  const campOptions = camps.map((camp) => ({
    value: camp.id,
    label: camp.name,
  }));

  const guestOptions = filteredGuests.map((guest) => ({
    value: guest.id,
    label: formatGuestLabel(guest),
  }));

  const canSubmit =
    mode === "existing"
      ? Boolean(selectedCampId && selectedGuestId)
      : Boolean(
          selectedCampId && newGuestName.trim().length >= 2 && newGuestCategory,
        );

  useEffect(() => {
    if (existingState.ok && existingState.redirectTo) {
      router.replace(existingState.redirectTo);
    }
  }, [existingState.ok, existingState.redirectTo, router]);

  useEffect(() => {
    if (newGuestState.ok && newGuestState.redirectTo) {
      router.replace(newGuestState.redirectTo);
    }
  }, [newGuestState.ok, newGuestState.redirectTo, router]);

  function handleCampChange(value: string): void {
    setSelectedCampId(value);
    setSelectedGuestId("");
  }

  function handleModeChange(nextMode: GuestMode): void {
    setMode(nextMode);
    setSelectedGuestId("");
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="alert alert-danger">{state.error}</div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="border border-border bg-surface">
            <div className="space-y-4 p-4">
              <ModeToggle
                value={mode}
                disabled={isPending}
                onChange={handleModeChange}
              />

              <div className="form-grid">
                <Select
                  label="Camp"
                  id="campId"
                  name="campId"
                  required
                  value={selectedCampId}
                  onChange={(event) =>
                    handleCampChange(event.currentTarget.value)
                  }
                  placeholder="Select camp"
                  options={campOptions}
                  disabled={isPending || camps.length === 0}
                  error={getFieldError(state.fieldErrors?.campId)}
                />

                {mode === "existing" ? (
                  <Select
                    label="Guest"
                    id="guestId"
                    name="guestId"
                    required
                    value={selectedGuestId}
                    onChange={(event) =>
                      setSelectedGuestId(event.currentTarget.value)
                    }
                    placeholder={
                      selectedCampId
                        ? "Select guest"
                        : "Select camp before guest"
                    }
                    options={guestOptions}
                    disabled={
                      isPending ||
                      !selectedCampId ||
                      filteredGuests.length === 0
                    }
                    error={getFieldError(state.fieldErrors?.guestId)}
                    hint={
                      selectedCampId && filteredGuests.length === 0
                        ? "No active guests found for the selected camp. Switch to New guest if this person is not yet registered."
                        : undefined
                    }
                  />
                ) : (
                  <Input
                    label="Guest full name"
                    id="fullName"
                    name="fullName"
                    required
                    value={newGuestName}
                    onChange={(event) =>
                      setNewGuestName(event.currentTarget.value)
                    }
                    placeholder="Full name as shown on ID or passport"
                    disabled={isPending}
                    error={getFieldError(state.fieldErrors?.fullName)}
                  />
                )}
              </div>
            </div>
          </section>

          {mode === "new" ? (
            <section className="border border-border bg-surface">
              <div className="form-grid p-4">
                <Select
                  label="Guest category"
                  id="guestCategory"
                  name="guestCategory"
                  required
                  value={newGuestCategory}
                  onChange={(event) =>
                    setNewGuestCategory(event.currentTarget.value)
                  }
                  options={GUEST_CATEGORY_OPTIONS}
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.guestCategory)}
                />

                <Select
                  label="Gender"
                  id="gender"
                  name="gender"
                  options={GENDER_OPTIONS}
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.gender)}
                />

                <Input
                  label="Phone"
                  id="phone"
                  name="phone"
                  placeholder="Phone number"
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.phone)}
                />

                <Input
                  label="Email"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.email)}
                />

                <Input
                  label="ID / Passport number"
                  id="idOrPassportNumber"
                  name="idOrPassportNumber"
                  placeholder="Passport or national ID"
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.idOrPassportNumber)}
                />

                <Input
                  label="Nationality"
                  id="nationality"
                  name="nationality"
                  placeholder="Nationality"
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.nationality)}
                />

                <Input
                  label="Organization"
                  id="organization"
                  name="organization"
                  placeholder="Company, embassy, project..."
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.organization)}
                />

                <Input
                  label="Department / project"
                  id="departmentOrProject"
                  name="departmentOrProject"
                  placeholder="Department or project"
                  disabled={isPending}
                  error={getFieldError(state.fieldErrors?.departmentOrProject)}
                />
              </div>
            </section>
          ) : null}

          <section className="border border-border bg-surface">
            <div className="form-grid p-4">
              <Input
                label="Expected arrival"
                id="expectedArrivalAt"
                name="expectedArrivalAt"
                type="datetime-local"
                required
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.expectedArrivalAt)}
              />

              <Input
                label="Expected departure"
                id="expectedDepartureAt"
                name="expectedDepartureAt"
                type="datetime-local"
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.expectedDepartureAt)}
              />
            </div>
          </section>

          <section className="border border-border bg-surface">
            <div className="form-grid p-4">
              <Input
                label="Host name"
                id="hostName"
                name="hostName"
                placeholder="Person or office expecting the guest"
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.hostName)}
              />

              <Input
                label="Host department"
                id="hostDepartment"
                name="hostDepartment"
                placeholder="Reception, Operations, Security..."
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.hostDepartment)}
              />

              <Input
                wrapperClassName="md:col-span-2"
                label="Purpose"
                id="purpose"
                name="purpose"
                placeholder="Reason for expected arrival"
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.purpose)}
              />

              <Textarea
                wrapperClassName="md:col-span-2"
                label="Notes"
                id="notes"
                name="notes"
                rows={4}
                placeholder="Internal reception notes"
                disabled={isPending}
                error={getFieldError(state.fieldErrors?.notes)}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="border border-border bg-surface">
            <div className="p-4">
              <dl className="divide-y divide-border">
                <SummaryRow label="Mode" value={formatModeLabel(mode)} />

                <SummaryRow
                  label="Camp"
                  value={selectedCamp?.name ?? "No camp selected"}
                />

                <SummaryRow
                  label="Guest"
                  value={
                    mode === "existing" ? (
                      selectedGuest ? (
                        <GuestNameWithPhoto
                          guestId={selectedGuest.id}
                          name={selectedGuest.full_name}
                        />
                      ) : (
                        "No guest selected"
                      )
                    ) : (
                      newGuestName.trim() || "No guest name entered"
                    )
                  }
                />

                <SummaryRow
                  label="Contact"
                  value={
                    mode === "existing"
                      ? selectedGuest
                        ? compactJoin([
                            selectedGuest.phone,
                            selectedGuest.email,
                            selectedGuest.organization,
                          ]) || "No contact details"
                        : "—"
                      : "Entered in new guest details"
                  }
                />
              </dl>
            </div>
          </section>

          <section className="border border-border bg-surface">
            <div className="p-4">
              {canSubmit ? (
                <Button
                  type="submit"
                  loading={isPending}
                  loadingText="Creating..."
                  fullWidth
                >
                  {mode === "existing"
                    ? "Create expected arrival"
                    : "Create guest and expected arrival"}
                </Button>
              ) : (
                <StatusIndicator
                  compact
                  statusClassName="status-muted"
                  label={
                    mode === "existing"
                      ? "Select camp and guest first"
                      : "Enter camp, guest name, and category"
                  }
                />
              )}

              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                fullWidth
                className="mt-2"
                onClick={() => router.push(EXPECTED_ARRIVALS_ROUTE)}
              >
                Cancel
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
