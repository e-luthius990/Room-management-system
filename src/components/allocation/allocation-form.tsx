"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  createAllocationAction,
  type AllocationActionState,
} from "@/lib/actions/allocations/allocations";
import type {
  AllocationGuest,
  AllocationRoom,
} from "@/lib/queries/allocations/allocations";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

type AllocationFormProps = {
  guests: AllocationGuest[];
  rooms: AllocationRoom[];
};

const initialState: AllocationActionState = {
  status: "idle",
  message: null,
};

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDateTimeLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function defaultArrival(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);

  return toDateTimeLocalInput(date);
}

function defaultDeparture(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);

  return toDateTimeLocalInput(date);
}

function getRoomSearchLabel(room: AllocationRoom): string {
  return [
    room.room_number,
    `room ${room.room_number}`,
    room.building_name,
    room.building_code,
    room.room_type_name,
    room.bed_type ?? "",
    room.camp_name,
    room.camp_code,
    room.current_status,
    room.is_delegate_suitable ? "delegate" : "",
  ]
    .join(" ")
    .toLowerCase();
}

function SelectionPlate(): React.JSX.Element {
  return (
    <StatusIndicator compact withDot={false} tone="brand" label="Selected" />
  );
}

function SelectionStep({
  index,
  title,
  active,
  complete,
}: {
  index: number;
  title: string;
  active?: boolean;
  complete?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 border px-2.5 py-2",
        "rounded-md",
        complete && "border-success-600/25 bg-success-50",
        active && !complete && "border-brand-600/25 bg-brand-50",
        !active && !complete && "border-border bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center border text-[11px] font-bold",
          "rounded-sm",
          complete
            ? "border-success-600/25 bg-surface text-success-700"
            : active
              ? "border-brand-600/25 bg-surface text-brand-700"
              : "border-border bg-surface text-muted",
        )}
      >
        {index}
      </span>

      <span className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {title}
      </span>
    </div>
  );
}

function GuestSelectionRow({
  guest,
  selected,
  disabled,
  onSelect,
}: {
  guest: AllocationGuest;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "entity-row w-full text-left outline-none disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
        selected && "bg-brand-50",
      )}
    >
      <div className="min-w-0">
        <div className="entity-title truncate">{guest.full_name}</div>

        <div className="entity-meta truncate">
          {guest.organization ?? "No organization"} ·{" "}
          {formatLabel(guest.guest_category)}
        </div>
      </div>

      {selected ? <SelectionPlate /> : null}
    </button>
  );
}

function RoomTile({
  room,
  selected,
  disabled,
  onSelect,
}: {
  room: AllocationRoom;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "relative min-h-[8.25rem] border bg-surface-2 p-3 text-left outline-none transition disabled:pointer-events-none disabled:opacity-60",
        "rounded-md hover:border-border-strong hover:bg-surface hover:shadow-command focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
        selected && "border-brand-500 bg-brand-50 shadow-command",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-3 top-2 h-1 rounded-[2px] bg-success-600"
      />

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-3 tracking-[0.14em] text-muted">
            {room.building_code} · {room.camp_code}
          </div>

          <div className="mt-2 text-2xl font-semibold leading-7 tracking-[-0.05em] text-foreground">
            {room.room_number}
          </div>
        </div>

        {selected ? <SelectionPlate /> : null}
      </div>

      <div className="mt-2 text-[11px] font-medium leading-4 text-muted">
        {formatLabel(room.room_type_name)}
      </div>

      <div className="mt-0.5 truncate text-[11px] leading-4 text-muted">
        {formatLabel(room.bed_type)}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusIndicator
          compact
          withDot={false}
          tone="success"
          label="Vacant"
        />

        {room.is_delegate_suitable ? (
          <StatusIndicator
            compact
            withDot={false}
            tone="brand"
            label="Delegate"
          />
        ) : null}
      </div>
    </button>
  );
}

export function AllocationForm({
  guests,
  rooms,
}: AllocationFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(
    createAllocationAction,
    initialState,
  );

  const [guestSearch, setGuestSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [campId, setCampId] = useState("all");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const arrivalDefault = useMemo(() => defaultArrival(), []);
  const departureDefault = useMemo(() => defaultDeparture(), []);

  const camps = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    for (const room of rooms) {
      map.set(room.camp_id, {
        id: room.camp_id,
        name: room.camp_name,
      });
    }

    return Array.from(map.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [rooms]);

  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const filteredGuests = useMemo(() => {
    const search = normalizeSearch(guestSearch);

    return guests
      .filter((guest) => {
        if (!search) {
          return true;
        }

        return [guest.full_name, guest.organization ?? "", guest.guest_category]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .slice(0, 12);
  }, [guestSearch, guests]);

  const matchingRooms = useMemo(() => {
    const search = normalizeSearch(roomSearch);

    return rooms.filter((room) => {
      if (campId !== "all" && room.camp_id !== campId) {
        return false;
      }

      if (!search) {
        return true;
      }

      return getRoomSearchLabel(room).includes(search);
    });
  }, [campId, roomSearch, rooms]);

  const filteredRooms = useMemo(() => {
    const search = normalizeSearch(roomSearch);
    return matchingRooms.slice(0, search ? 96 : 48);
  }, [matchingRooms, roomSearch]);

  const visibleRoomCount = filteredRooms.length;
  const totalMatchingRoomCount = matchingRooms.length;

  const canSubmit = Boolean(selectedGuest && selectedRoom);

  function handleCampChange(value: string): void {
    if (isPending) {
      return;
    }

    setCampId(value);
    setSelectedRoomId("");
  }

  return (
    <form action={formAction} className="space-y-4" aria-busy={isPending}>
      <input type="hidden" name="guest_id" value={selectedGuestId} />
      <input type="hidden" name="room_id" value={selectedRoomId} />

      {state.status === "error" && state.message ? (
        <div className="alert alert-danger">{state.message}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SelectionStep
          index={1}
          title={selectedGuest ? selectedGuest.full_name : "Select guest"}
          active={!selectedGuest}
          complete={Boolean(selectedGuest)}
        />

        <SelectionStep
          index={2}
          title={
            selectedRoom ? `Room ${selectedRoom.room_number}` : "Select room"
          }
          active={Boolean(selectedGuest) && !selectedRoom}
          complete={Boolean(selectedRoom)}
        />

        <SelectionStep
          index={3}
          title="Confirm allocation"
          active={canSubmit}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0 space-y-4">
          <Card variant="console">
            <CardHeader dense>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-sm">Select guest</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Search and select the guest being allocated.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent dense className="space-y-3">
              <Input
                label="Search guest"
                value={guestSearch}
                disabled={isPending}
                onChange={(event) => setGuestSearch(event.target.value)}
                placeholder="Name, organization, category..."
              />

              {filteredGuests.length > 0 ? (
                <div className="entity-list max-h-[17rem] overflow-y-auto">
                  {filteredGuests.map((guest) => (
                    <GuestSelectionRow
                      key={guest.id}
                      guest={guest}
                      selected={selectedGuestId === guest.id}
                      disabled={isPending}
                      onSelect={() => setSelectedGuestId(guest.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  title="No matching guests"
                  description="Try another name, organization, or category."
                />
              )}
            </CardContent>
          </Card>

          <Card variant="console">
            <CardHeader dense>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(27rem,0.95fr)] xl:items-end">
                <div className="min-w-0">
                  <CardTitle className="text-sm">Select room</CardTitle>
                  <CardDescription className="text-xs leading-5">
                    Search by room number, building, bed type, room type, or
                    camp.
                  </CardDescription>

                  <div className="mt-2 text-xs font-medium text-muted">
                    Showing {visibleRoomCount} of {totalMatchingRoomCount}{" "}
                    matching vacant rooms.
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <Select
                    aria-label="Filter by camp"
                    value={campId}
                    disabled={isPending}
                    onChange={(event) => handleCampChange(event.target.value)}
                    options={[
                      { value: "all", label: "All camps" },
                      ...camps.map((camp) => ({
                        value: camp.id,
                        label: camp.name,
                      })),
                    ]}
                  />

                  <Input
                    aria-label="Search rooms"
                    value={roomSearch}
                    disabled={isPending}
                    onChange={(event) => setRoomSearch(event.target.value)}
                    placeholder="Search CR10, airport, single..."
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent dense>
              {filteredRooms.length > 0 ? (
                <div className="room-matrix border-0 shadow-none">
                  <div className="room-matrix-scroll max-h-[calc(100dvh-22rem)]">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 p-3">
                      {filteredRooms.map((room) => (
                        <RoomTile
                          key={room.id}
                          room={room}
                          selected={selectedRoomId === room.id}
                          disabled={isPending}
                          onSelect={() => setSelectedRoomId(room.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  title="No rooms match this filter"
                  description="Search another room number, building, bed type, or camp."
                />
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Stay window</CardTitle>
              <CardDescription className="text-xs leading-5">
                Set the expected arrival and departure before allocating.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-3">
              <Input
                label="Expected arrival"
                name="expected_arrival_at"
                type="datetime-local"
                defaultValue={arrivalDefault}
                disabled={isPending}
                required
              />

              <Input
                label="Expected departure"
                name="expected_departure_at"
                type="datetime-local"
                defaultValue={departureDefault}
                disabled={isPending}
                required
              />

              <Textarea
                label="Allocation note"
                name="notes"
                rows={3}
                maxLength={700}
                disabled={isPending}
                placeholder="Optional reception note..."
              />
            </CardContent>
          </Card>

          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Allocation summary</CardTitle>
              <CardDescription className="text-xs leading-5">
                Confirm the selected guest and room.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              <div className="metadata-item">
                <div className="metadata-label">Guest</div>
                <div className="metadata-value">
                  {selectedGuest
                    ? selectedGuest.full_name
                    : "No guest selected"}
                </div>

                {selectedGuest ? (
                  <div className="mt-1 truncate text-xs text-muted">
                    {selectedGuest.organization ?? "No organization"} ·{" "}
                    {formatLabel(selectedGuest.guest_category)}
                  </div>
                ) : null}
              </div>

              <div className="metadata-item">
                <div className="metadata-label">Room</div>
                <div className="metadata-value">
                  {selectedRoom
                    ? `Room ${selectedRoom.room_number}`
                    : "No room selected"}
                </div>

                {selectedRoom ? (
                  <div className="mt-1 truncate text-xs text-muted">
                    {selectedRoom.building_code} · {selectedRoom.camp_name}
                  </div>
                ) : null}
              </div>

              {selectedRoom ? (
                <div className="grid gap-2">
                  <StatusIndicator
                    compact
                    withDot={false}
                    tone="success"
                    label={formatLabel(selectedRoom.current_status)}
                  />

                  <StatusIndicator
                    compact
                    withDot={false}
                    tone="info"
                    label={formatLabel(selectedRoom.room_type_name)}
                  />

                  {selectedRoom.is_delegate_suitable ? (
                    <StatusIndicator
                      compact
                      withDot={false}
                      tone="brand"
                      label="Delegate suitable"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-2 border-t border-border pt-4">
                <PendingSubmitButton
                  pendingLabel="Allocating room"
                  disabled={!canSubmit || isPending}
                  fullWidth
                >
                  Allocate room
                </PendingSubmitButton>

                <Link
                  href={APP_ROUTES.allocations.list}
                  aria-disabled={isPending}
                  className={cn(
                    "btn-secondary w-full",
                    isPending && "pointer-events-none opacity-55",
                  )}
                >
                  Cancel
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </form>
  );
}
