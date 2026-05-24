import type {
  ReservationGuestOption,
  ReservationRoomOption,
} from "@/lib/queries/reservations/options";
import { createReservationAction } from "@/lib/actions/reservations/create-reservation";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

type ReservationFormProps = {
  guests: ReservationGuestOption[];
  rooms: ReservationRoomOption[];
};

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unspecified";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactJoin(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function formatRoomLabel(room: ReservationRoomOption): string {
  const flags = compactJoin([
    room.is_vip ? "VIP" : null,
    room.is_delegate_suitable ? "Delegate suitable" : null,
  ]);

  return compactJoin([
    `${room.camp_name} / ${room.building_name} / Room ${room.room_number}`,
    formatLabel(room.room_type),
    `Capacity ${room.capacity}`,
    formatLabel(room.current_status),
    flags,
  ]);
}

function formatGuestLabel(guest: ReservationGuestOption): string {
  return compactJoin([
    guest.full_name,
    formatLabel(guest.guest_category),
    guest.primary_camp_name,
    guest.organization_name,
  ]);
}

function FormSectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}): React.JSX.Element {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        Reservation control
      </div>

      <h2 className="mt-1 text-sm font-semibold tracking-[-0.015em] text-foreground">
        {title}
      </h2>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ReservationForm({
  guests,
  rooms,
}: ReservationFormProps): React.JSX.Element {
  const hasGuests = guests.length > 0;
  const hasRooms = rooms.length > 0;
  const canCreateReservation = hasGuests && hasRooms;

  const guestOptions = guests.map((guest) => ({
    value: guest.id,
    label: formatGuestLabel(guest),
  }));

  const roomOptions = rooms.map((room) => ({
    value: room.room_id,
    label: formatRoomLabel(room),
  }));

  return (
    <form action={createReservationAction} className="space-y-5">
      {!canCreateReservation ? (
        <div
          role="status"
          className="border border-warning-700/25 bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          <p className="font-semibold">Reservation cannot be created yet.</p>

          <p className="mt-1 text-xs leading-5 text-warning-700">
            {!hasGuests && !hasRooms
              ? "No eligible guests or rooms are available for this reservation scope."
              : !hasGuests
                ? "No eligible guest profile is available for this reservation scope."
                : "No eligible room is available for this reservation scope."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="border border-border bg-surface">
            <FormSectionHeader
              title="Who is the room held for?"
              description="Select the guest and the room to protect before arrival."
            />

            <div className="form-grid p-4">
              <Select
                wrapperClassName="md:col-span-2"
                label="Guest"
                id="guestId"
                name="guestId"
                required
                defaultValue=""
                placeholder="Select guest"
                options={guestOptions}
                disabled={!hasGuests}
              />

              <Select
                wrapperClassName="md:col-span-2"
                label="Room"
                id="roomId"
                name="roomId"
                required
                defaultValue=""
                placeholder="Select room"
                hint="Only eligible rooms are shown. The database still checks overlap and room state before saving."
                options={roomOptions}
                disabled={!hasRooms}
              />
            </div>
          </section>

          <section className="border border-border bg-surface">
            <FormSectionHeader
              title="When should reception expect the guest?"
              description="These times control the expected-arrivals queue, room blocking, and reception visibility."
            />

            <div className="form-grid p-4">
              <Input
                label="Expected arrival"
                id="expectedArrivalAt"
                name="expectedArrivalAt"
                type="datetime-local"
                required
                disabled={!canCreateReservation}
              />

              <Input
                label="Expected departure"
                id="expectedDepartureAt"
                name="expectedDepartureAt"
                type="datetime-local"
                required
                disabled={!canCreateReservation}
              />

              <Textarea
                wrapperClassName="md:col-span-2"
                label="Reservation notes"
                id="notes"
                name="notes"
                rows={4}
                maxLength={500}
                placeholder="Operational notes for reception, managers, or security"
                disabled={!canCreateReservation}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-border bg-surface">
            <FormSectionHeader
              title="Control flags"
              description="Use only when this hold needs closer management visibility."
            />

            <div className="p-4">
              <label className="flex items-start gap-3 border border-border bg-surface-2 px-3 py-3 text-sm text-muted">
                <input
                  name="isVipHold"
                  type="checkbox"
                  className="checkbox mt-1"
                  disabled={!canCreateReservation}
                />

                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">
                    VIP / delegate hold
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-muted">
                    Marks the reservation for closer monitoring before arrival.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="border border-border bg-surface">
            <FormSectionHeader
              title="Create reservation"
              description="Save this room hold and send it into the reception expected-arrivals workflow."
            />

            <div className="p-4">
              {canCreateReservation ? (
                <PendingSubmitButton
                  pendingLabel="Creating reservation..."
                  fullWidth
                >
                  Create reservation
                </PendingSubmitButton>
              ) : (
                <StatusIndicator
                  compact
                  statusClassName="status-muted"
                  label="Missing guest or room options"
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
