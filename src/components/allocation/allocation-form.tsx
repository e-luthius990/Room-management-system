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
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
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

function SelectionBadge(): React.JSX.Element {
  return (
    <span className="rounded-full border border-brand-600/25 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
      Selected
    </span>
  );
}

export function AllocationForm({
  guests,
  rooms,
}: AllocationFormProps): React.JSX.Element {
  const [state, formAction] = useActionState(
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

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rooms]);

  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const filteredGuests = useMemo(() => {
    const search = normalizeSearch(guestSearch);

    return guests
      .filter((guest) => {
        if (!search) return true;

        return [guest.full_name, guest.organization ?? "", guest.guest_category]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .slice(0, 12);
  }, [guestSearch, guests]);

  const filteredRooms = useMemo(() => {
    const search = normalizeSearch(roomSearch);

    return rooms
      .filter((room) => {
        if (campId !== "all" && room.camp_id !== campId) {
          return false;
        }

        if (!search) return true;

        return [
          room.room_number,
          room.building_name,
          room.building_code,
          room.room_type_name,
          room.bed_type ?? "",
          room.camp_name,
          room.camp_code,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .slice(0, 18);
  }, [campId, roomSearch, rooms]);

  const canSubmit = Boolean(selectedGuest && selectedRoom);

  function handleCampChange(value: string): void {
    setCampId(value);
    setSelectedRoomId("");
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="guest_id" value={selectedGuestId} />
      <input type="hidden" name="room_id" value={selectedRoomId} />

      {state.status === "error" && state.message ? (
        <div className="alert alert-danger">{state.message}</div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card variant="card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Select guest</CardTitle>
                <CardDescription>
                  Choose the guest who needs a room allocation.
                </CardDescription>
              </div>

              <span className="w-fit rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                Guest record
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              label="Search guest"
              value={guestSearch}
              onChange={(event) => setGuestSearch(event.target.value)}
              placeholder="Name, organization, category..."
            />

            {filteredGuests.length > 0 ? (
              <div className="entity-list">
                {filteredGuests.map((guest) => {
                  const selected = selectedGuestId === guest.id;

                  return (
                    <button
                      key={guest.id}
                      type="button"
                      onClick={() => setSelectedGuestId(guest.id)}
                      className={cn(
                        "entity-row w-full text-left",
                        selected && "bg-brand-50",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="entity-title truncate">
                          {guest.full_name}
                        </div>

                        <div className="entity-meta truncate">
                          {guest.organization ?? "No organization"} ·{" "}
                          {formatLabel(guest.guest_category)}
                        </div>
                      </div>

                      {selected ? <SelectionBadge /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                size="sm"
                title="No matching guests"
                description="Try another name, organization, or guest category."
              />
            )}
          </CardContent>
        </Card>

        <Card variant="card">
          <CardHeader>
            <CardTitle>Stay window</CardTitle>
            <CardDescription>
              This period reserves the room and prevents overlapping stay
              allocations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              label="Expected arrival"
              name="expected_arrival_at"
              type="datetime-local"
              defaultValue={arrivalDefault}
              required
            />

            <Input
              label="Expected departure"
              name="expected_departure_at"
              type="datetime-local"
              defaultValue={departureDefault}
              required
            />

            <Textarea
              label="Allocation note"
              name="notes"
              rows={5}
              maxLength={700}
              placeholder="Optional reception note..."
            />
          </CardContent>
        </Card>
      </section>

      <Card variant="card">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>Select vacant ready room</CardTitle>
              <CardDescription>
                Only rooms currently marked vacant ready are shown here.
              </CardDescription>
            </div>

            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,20rem)]">
              <Select
                aria-label="Filter by camp"
                value={campId}
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
                onChange={(event) => setRoomSearch(event.target.value)}
                placeholder="Search room, building, bed..."
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredRooms.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((room) => {
                const selected = selectedRoomId === room.id;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "rounded-2xl border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-soft",
                      selected && "border-brand-500/35 bg-brand-50 shadow-soft",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold tracking-[-0.035em] text-foreground">
                          Room {room.room_number}
                        </div>

                        <div className="mt-1 truncate text-xs font-medium text-muted">
                          {room.building_code} · {room.camp_name}
                        </div>
                      </div>

                      {selected ? <SelectionBadge /> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
                        {formatLabel(room.room_type_name)}
                      </span>

                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
                        {formatLabel(room.bed_type)}
                      </span>

                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {formatLabel(room.current_status)}
                      </span>

                      {room.is_delegate_suitable ? (
                        <span className="rounded-full border border-brand-600/25 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          Delegate
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              size="sm"
              title="No vacant ready rooms match this filter"
              description="Try another camp, building, room number, or bed type."
            />
          )}
        </CardContent>
      </Card>

      <section className="sticky bottom-4 z-20 rounded-2xl border border-border bg-surface/95 p-4 shadow-floating backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              Allocation summary
            </div>

            <div className="mt-1 truncate text-sm text-muted">
              {selectedGuest ? selectedGuest.full_name : "No guest selected"}{" "}
              {selectedRoom
                ? `→ Room ${selectedRoom.room_number}`
                : "→ No room selected"}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.allocations.list} className="btn-secondary">
              Cancel
            </Link>

            <Button type="submit" disabled={!canSubmit}>
              Allocate room
            </Button>
          </div>
        </div>
      </section>
    </form>
  );
}
