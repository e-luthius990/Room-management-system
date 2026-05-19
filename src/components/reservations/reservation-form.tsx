import type {
  ReservationGuestOption,
  ReservationRoomOption,
} from "@/lib/queries/reservations/options";
import { createReservationAction } from "@/lib/actions/reservations/create-reservation";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type ReservationFormProps = {
  guests: ReservationGuestOption[];
  rooms: ReservationRoomOption[];
};

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRoomLabel(room: ReservationRoomOption): string {
  const flags = [
    room.is_vip ? "VIP" : null,
    room.is_delegate_suitable ? "Delegate Suitable" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `${room.camp_name} / ${room.building_name} / Room ${room.room_number}`,
    room.room_type,
    `Capacity ${room.capacity}`,
    formatLabel(room.current_status),
    flags,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatGuestLabel(guest: ReservationGuestOption): string {
  return [
    guest.full_name,
    formatLabel(guest.guest_category),
    guest.primary_camp_name,
    guest.organization_name,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ReservationForm({
  guests,
  rooms,
}: ReservationFormProps): React.JSX.Element {
  const guestOptions = guests.map((guest) => ({
    value: guest.id,
    label: formatGuestLabel(guest),
  }));

  const roomOptions = rooms.map((room) => ({
    value: room.room_id,
    label: formatRoomLabel(room),
  }));

  return (
    <form action={createReservationAction} className="space-y-6">
      <div className="form-grid">
        <Select
          wrapperClassName="md:col-span-2"
          label="Guest"
          id="guestId"
          name="guestId"
          required
          defaultValue=""
          placeholder="Select guest"
          options={guestOptions}
        />

        <Select
          wrapperClassName="md:col-span-2"
          label="Room"
          id="roomId"
          name="roomId"
          required
          defaultValue=""
          placeholder="Select room"
          hint="Date overlap, room access, and operational availability are validated again by the database when the reservation is created."
          options={roomOptions}
        />

        <Input
          label="Expected arrival"
          id="expectedArrivalAt"
          name="expectedArrivalAt"
          type="datetime-local"
          required
        />

        <Input
          label="Expected departure"
          id="expectedDepartureAt"
          name="expectedDepartureAt"
          type="datetime-local"
          required
        />

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted md:col-span-2">
          <input name="isVipHold" type="checkbox" className="checkbox mt-1" />

          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Mark as VIP/delegate hold
            </span>

            <span className="mt-1 block text-xs leading-5 text-muted">
              Use this when the reservation is sensitive or must be monitored by
              managers before arrival.
            </span>
          </span>
        </label>

        <Textarea
          wrapperClassName="md:col-span-2"
          label="Notes"
          id="notes"
          name="notes"
          rows={4}
          maxLength={500}
          placeholder="Operational reservation notes"
        />
      </div>

      <div className="form-actions">
        <PendingSubmitButton pendingLabel="Creating reservation...">
          Create reservation
        </PendingSubmitButton>
      </div>
    </form>
  );
}
