import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Crown, Search } from "lucide-react";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  getRoomBoardRoom,
  getRoomOccupancyHistory,
  type RoomOccupancyHistoryItem,
} from "@/lib/queries/room-board/get-room-board";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { Input } from "@/components/ui/Input";
import {
  AutoStatusIndicator,
  StatusIndicator,
} from "@/components/ui/StatusIndicator";

type RoomDetailPageSearchParams = {
  q?: string | string[];
};

type RoomDetailPageProps = {
  params: Promise<{
    roomId: string;
  }>;
  searchParams?: Promise<RoomDetailPageSearchParams>;
};

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function formatLabel(value: string | null | undefined): string {
  const text = String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text
    ? text.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Not set";
}

function formatDateTime(value: string | null | undefined): string {
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

function getCheckInTime(stay: RoomOccupancyHistoryItem | null): string {
  return formatDateTime(stay?.checked_in_at ?? stay?.expected_arrival_at);
}

function getCheckoutTime(stay: RoomOccupancyHistoryItem | null): string {
  return formatDateTime(stay?.checked_out_at ?? stay?.expected_departure_at);
}

function occupancyMatchesSearch(
  stay: RoomOccupancyHistoryItem,
  query: string,
): boolean {
  if (!query) {
    return true;
  }

  return [
    stay.guest_name,
    stay.guest_organization,
    stay.guest_category,
    formatLabel(stay.status),
    formatDateTime(stay.checked_in_at ?? stay.expected_arrival_at),
    formatDateTime(stay.checked_out_at ?? stay.expected_departure_at),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-5 text-foreground">
        {value}
      </dd>
    </div>
  );
}

function GuestLink({
  guestId,
  name,
  photoPath,
  photoUpdatedAt,
}: {
  guestId: string;
  name: string;
  photoPath?: string | null;
  photoUpdatedAt?: string | null;
}): React.JSX.Element {
  return (
    <Link
      href={APP_ROUTES.guests.detail(guestId)}
      className="font-semibold text-foreground underline-offset-4 hover:underline"
    >
      <GuestNameWithPhoto
        guestId={guestId}
        name={name}
        photoPath={photoPath}
        photoUpdatedAt={photoUpdatedAt}
      />
    </Link>
  );
}

function StayActions({
  stayId,
}: {
  stayId: string | null;
}): React.JSX.Element | null {
  if (!stayId) {
    return null;
  }

  return (
    <Link href={APP_ROUTES.stays.detail(stayId)} className="btn-secondary">
      <BedDouble className="size-4" aria-hidden="true" />
      Open stay
    </Link>
  );
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: RoomDetailPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission(["rooms.view", "rooms.view_board"]);

  const { roomId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = normalizeSearch(getFirstSearchParam(resolvedSearchParams.q));

  const [room, history] = await Promise.all([
    getRoomBoardRoom(roomId),
    getRoomOccupancyHistory(roomId),
  ]);

  if (!room) {
    notFound();
  }

  const currentStay =
    history.find((stay) => stay.stay_id === room.current_stay_id) ?? null;

  const currentGuestName =
    currentStay?.guest_name ?? room.current_guest_name ?? "No active guest";

  const previousStays = history.filter(
    (stay) => stay.stay_id !== currentStay?.stay_id,
  );

  const filteredPreviousStays = previousStays.filter((stay) =>
    occupancyMatchesSearch(stay, query),
  );

  return (
    <div className="page-stack">
      <Card variant="console">
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <Input
              name="q"
              defaultValue={query}
              label="Search room history"
              placeholder="Search previous occupants, organization, status, dates..."
              leftIcon={<Search className="size-4" aria-hidden="true" />}
            />

            <Button type="submit" variant="primary">
              Search
            </Button>

            {query ? (
              <Link href={APP_ROUTES.rooms.detail(room.room_id)} className="btn-secondary">
                Clear
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card variant="console">
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room {room.room_number}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {room.camp_name} - {room.building_name}
                </p>
              </div>

              <AutoStatusIndicator compact status={room.current_status} />
            </div>

            <div className="flex flex-wrap gap-2">
              {room.is_vip ? (
                <StatusIndicator
                  compact
                  withDot={false}
                  statusClassName="status-reserved"
                  label={
                    <span className="inline-flex items-center gap-1">
                      <Crown className="size-3" aria-hidden="true" />
                      VIP
                    </span>
                  }
                />
              ) : null}

              {room.is_delegate_suitable ? (
                <StatusIndicator
                  compact
                  withDot={false}
                  statusClassName="status-occupied"
                  label="Delegate suitable"
                />
              ) : null}
            </div>

            <dl className="divide-y divide-border">
              <DetailRow label="Type" value={room.room_type} />
              <DetailRow label="Capacity" value={room.capacity} />
              <DetailRow
                label="Condition"
                value={formatLabel(room.condition_status)}
              />
            </dl>

            <Link href={APP_ROUTES.rooms.board} className="btn-secondary">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Room board
            </Link>
          </CardContent>
        </Card>

        <Card variant="console">
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Current occupant
                </div>
                <div className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                  {currentStay ? (
                    <GuestLink
                      guestId={currentStay.guest_id}
                      name={currentGuestName}
                      photoPath={currentStay.guest_profile_photo_path}
                      photoUpdatedAt={
                        currentStay.guest_profile_photo_updated_at
                      }
                    />
                  ) : room.current_guest_id && room.current_guest_name ? (
                    <GuestLink
                      guestId={room.current_guest_id}
                      name={room.current_guest_name}
                      photoPath={room.current_guest_profile_photo_path}
                      photoUpdatedAt={
                        room.current_guest_profile_photo_updated_at
                      }
                    />
                  ) : (
                    currentGuestName
                  )}
                </div>
              </div>

              <StayActions stayId={room.current_stay_id} />
            </div>

            <dl className="divide-y divide-border">
              <DetailRow
                label="Check-in"
                value={getCheckInTime(currentStay)}
              />
              <DetailRow
                label="Checkout"
                value={formatDateTime(
                  currentStay?.checked_out_at ??
                    currentStay?.expected_departure_at ??
                    room.expected_departure_at,
                )}
              />
              <DetailRow
                label="Status"
                value={formatLabel(currentStay?.status ?? room.current_status)}
              />
              <DetailRow
                label="Organization"
                value={currentStay?.guest_organization ?? "Not set"}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card variant="console">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">
                Previous occupants
              </div>
              <div className="text-xs font-semibold text-muted">
                {filteredPreviousStays.length} of {previousStays.length} stays
              </div>
            </div>
          </div>

          {filteredPreviousStays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-surface-subtle">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    <th className="px-4 py-3 sm:px-5">Guest</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Checkout</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right sm:px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPreviousStays.map((stay) => (
                    <tr key={stay.stay_id}>
                      <td className="px-4 py-3 align-top sm:px-5">
                        <GuestLink
                          guestId={stay.guest_id}
                          name={stay.guest_name}
                          photoPath={stay.guest_profile_photo_path}
                          photoUpdatedAt={
                            stay.guest_profile_photo_updated_at
                          }
                        />
                        <div className="mt-1 text-xs text-muted">
                          {stay.guest_organization ?? "Organization not set"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-foreground">
                        {getCheckInTime(stay)}
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-foreground">
                        {getCheckoutTime(stay)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusIndicator
                          compact
                          status={stay.status}
                          label={formatLabel(stay.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right align-top sm:px-5">
                        <Link
                          href={APP_ROUTES.stays.detail(stay.stay_id)}
                          className="btn-secondary"
                        >
                          Open stay
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-sm font-medium text-muted sm:px-5">
              {query
                ? "No previous stays match this search."
                : "No previous stays recorded for this room."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
