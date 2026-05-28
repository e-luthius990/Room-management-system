"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  allocateExpectedArrivalAction,
  type ExpectedArrivalActionState,
} from "@/lib/actions/expected-arrivals";
import type { ExpectedArrivalRow } from "@/lib/queries/expected-arrivals";
import type { AllocationRoom } from "@/lib/queries/allocations/allocations";
import { APP_ROUTES } from "@/lib/auth/routes";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

type ExpectedArrivalAllocationFormProps = {
  expectedArrival: ExpectedArrivalRow;
  rooms: AllocationRoom[];
};

const initialState: ExpectedArrivalActionState = {
  ok: false,
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

function toDateTimeLocalInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function requireExpectedArrivalId(value: string | null): string {
  if (!value) {
    throw new Error("Expected arrival ID was not returned.");
  }

  return value;
}

function SelectionBadge(): React.JSX.Element {
  return (
    <span className="rounded-full border border-brand-600/25 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
      Selected
    </span>
  );
}

export function ExpectedArrivalAllocationForm({
  expectedArrival,
  rooms,
}: ExpectedArrivalAllocationFormProps): React.JSX.Element {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    allocateExpectedArrivalAction,
    initialState,
  );

  const [roomSearch, setRoomSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const expectedArrivalId = requireExpectedArrivalId(
    expectedArrival.expected_arrival_id,
  );

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const filteredRooms = useMemo(() => {
    const search = normalizeSearch(roomSearch);

    return rooms
      .filter((room) => {
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
  }, [roomSearch, rooms]);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, state.ok, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-5" aria-busy={isPending}>
      <input type="hidden" name="expectedArrivalId" value={expectedArrivalId} />
      <input type="hidden" name="roomId" value={selectedRoomId} />

      {state.error ? (
        <div className="alert alert-danger">{state.error}</div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card variant="card">
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Guest
              </p>
              <div className="mt-1">
                <GuestNameWithPhoto
                  guestId={expectedArrival.guest_id ?? ""}
                  name={expectedArrival.guest_name ?? "Unknown guest"}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Camp
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {expectedArrival.camp_name ?? "Unknown camp"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Expected arrival
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(expectedArrival.expected_arrival_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Expected departure
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(expectedArrival.expected_departure_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Host
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {expectedArrival.host_name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Purpose
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {expectedArrival.purpose ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="card">
          <CardContent className="space-y-4">
            <Input
              label="Expected departure"
              name="expectedDepartureAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalInput(
                expectedArrival.expected_departure_at,
              )}
              disabled={isPending}
              required
            />

            <Textarea
              label="Allocation note"
              name="notes"
              rows={5}
              maxLength={700}
              disabled={isPending}
              placeholder="Optional reception note..."
            />
          </CardContent>
        </Card>
      </section>

      <Card variant="card">
        <CardContent className="space-y-4">
          <Input
            aria-label="Search rooms"
            value={roomSearch}
            disabled={isPending}
            onChange={(event) => setRoomSearch(event.target.value)}
            placeholder="Search room, building, bed..."
            className="max-w-sm"
          />

          {filteredRooms.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((room) => {
                const selected = selectedRoomId === room.id;

                return (
                  <button
                    key={room.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "rounded-2xl border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-soft disabled:pointer-events-none disabled:opacity-60",
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
            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted">
              No vacant ready rooms match this search.
            </div>
          )}
        </CardContent>
      </Card>

      <section className="sticky bottom-4 z-20 rounded-2xl border border-border bg-surface/95 p-4 shadow-floating backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              Allocation summary
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted">
              <GuestNameWithPhoto
                guestId={expectedArrival.guest_id ?? ""}
                name={expectedArrival.guest_name ?? "Expected guest"}
              />
              {selectedRoom
                ? `→ Room ${selectedRoom.room_number}`
                : "→ No room selected"}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Link
              href={APP_ROUTES.reception.expectedArrivalDetail(
                expectedArrivalId,
              )}
              aria-disabled={isPending}
              className={cn(
                "btn-secondary",
                isPending && "pointer-events-none opacity-55",
              )}
            >
              Cancel
            </Link>

            <PendingSubmitButton
              pendingLabel="Allocating room..."
              disabled={!selectedRoom || isPending}
            >
              Allocate room
            </PendingSubmitButton>
          </div>
        </div>
      </section>
    </form>
  );
}
