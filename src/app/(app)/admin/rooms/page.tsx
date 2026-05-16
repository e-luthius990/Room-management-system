import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { createRoomAction } from "@/lib/actions/setup/rooms";
import {
  getBuildingOptions,
  getCampOptions,
  getRoomTypeOptions,
} from "@/lib/queries/setup/options";
import { getRoomInventory } from "@/lib/queries/setup/inventory";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";

type AdminRoomsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const HIDDEN_ROOM_STATUSES = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the room details and try again.",
    camp_not_allowed: "You do not have manager access to that camp.",
    invalid_camp: "Selected camp is invalid.",
    invalid_building: "Selected building is invalid or inactive.",
    invalid_room_type: "Selected room type is invalid or inactive.",
    invalid_gender_restriction: "Selected gender restriction is invalid.",
    invalid_capacity: "Room capacity must be at least 1.",
    access_denied: "You do not have access to create rooms.",
    room_create_failed: "Room could not be created.",
  };

  return messages[error] ?? "Room action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (success === "room_created") {
    return "Room created successfully.";
  }

  return null;
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRoomStatusLabel(status: string): string | null {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return null;
  }

  const labels: Record<string, string> = {
    vacant_ready: "Vacant ready",
    reserved: "Reserved",
    pending_check_in: "Pending check-in",
    occupied: "Occupied",
    pending_checkout: "Pending checkout",
    out_of_service: "Out of service",
    manager_hold: "Manager hold",
  };

  return labels[status] ?? null;
}

function getRoomStatusClass(status: string): string | null {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return null;
  }

  switch (status) {
    case "vacant_ready":
      return "status-vacant-ready";

    case "reserved":
    case "pending_check_in":
    case "pending_checkout":
      return "status-reserved";

    case "occupied":
      return "status-occupied";

    case "out_of_service":
    case "manager_hold":
      return "status-muted";

    default:
      return null;
  }
}

function getConditionClass(status: string): string {
  switch (status) {
    case "excellent":
    case "good":
      return "border-success-600/25 bg-success-50 text-success-700";

    case "fair":
    case "needs_attention":
      return "border-warning-700/25 bg-warning-50 text-warning-700";

    case "damaged":
      return "border-danger-600/25 bg-danger-50 text-danger-700";

    default:
      return "status-muted";
  }
}

function RoomStatusCell({ status }: { status: string }): React.JSX.Element {
  const label = getRoomStatusLabel(status);
  const className = getRoomStatusClass(status);

  if (!label || !className) {
    return <span />;
  }

  return <StatusIndicator label={label} statusClassName={className} />;
}

export default async function AdminRoomsPage({
  searchParams,
}: AdminRoomsPageProps): Promise<React.JSX.Element> {
  await requirePermission("rooms.view");

  const [query, camps, buildings, roomTypes, rooms] = await Promise.all([
    searchParams,
    getCampOptions(),
    getBuildingOptions(),
    getRoomTypeOptions(),
    getRoomInventory(),
  ]);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div className="page-stack">
      <PageHeader
        title="Room inventory"
        description="Create and review rooms used for reservations, allocations, and check-ins."
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[28rem_minmax(0,1fr)]">
        <Card variant="card">
          <CardHeader>
            <CardTitle>Add room</CardTitle>
            <CardDescription>
              New rooms are created with the database default readiness state.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={createRoomAction} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
                <Select
                  label="Camp"
                  id="room-camp-id"
                  required
                  name="campId"
                  defaultValue=""
                  placeholder="Select camp"
                  options={camps.map((camp) => ({
                    value: camp.id,
                    label: `${camp.name} (${camp.code})`,
                  }))}
                />

                <Select
                  label="Building"
                  id="room-building-id"
                  required
                  name="buildingId"
                  defaultValue=""
                  placeholder="Select building"
                  options={buildings.map((building) => ({
                    value: building.id,
                    label: `${building.name} (${building.code})`,
                  }))}
                />

                <Select
                  label="Room type"
                  id="room-type-id"
                  required
                  name="roomTypeId"
                  defaultValue=""
                  placeholder="Select room type"
                  options={roomTypes.map((type) => ({
                    value: type.id,
                    label: type.default_capacity
                      ? `${type.name} · default capacity ${type.default_capacity}`
                      : type.name,
                  }))}
                />

                <Input
                  label="Room number"
                  id="room-number"
                  required
                  name="roomNumber"
                  autoComplete="off"
                  maxLength={40}
                  placeholder="Room number"
                />

                <Input
                  label="Capacity"
                  id="room-capacity"
                  required
                  name="capacity"
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  placeholder="Capacity"
                />

                <Input
                  label="Floor label"
                  id="room-floor-label"
                  name="floorLabel"
                  autoComplete="off"
                  maxLength={240}
                  placeholder="Floor label"
                />

                <Input
                  label="Section label"
                  id="room-section-label"
                  name="sectionLabel"
                  autoComplete="off"
                  maxLength={240}
                  placeholder="Section label"
                />

                <Input
                  label="Bed type"
                  id="room-bed-type"
                  name="bedType"
                  autoComplete="off"
                  maxLength={240}
                  placeholder="Bed type"
                />

                <Select
                  label="Gender restriction"
                  id="room-gender-restriction"
                  name="genderRestriction"
                  defaultValue=""
                  options={[
                    { value: "", label: "No restriction" },
                    { value: "any", label: "Any gender" },
                    { value: "male", label: "Male only" },
                    { value: "female", label: "Female only" },
                  ]}
                />

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
                  <input name="isVip" type="checkbox" className="checkbox" />
                  <span className="font-semibold text-foreground">
                    VIP room
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
                  <input
                    name="isDelegateSuitable"
                    type="checkbox"
                    className="checkbox"
                  />
                  <span className="font-semibold text-foreground">
                    Delegate suitable
                  </span>
                </label>

                <div className="md:col-span-2 2xl:col-span-1">
                  <Textarea
                    label="Operational notes"
                    id="room-notes"
                    name="notes"
                    rows={3}
                    maxLength={240}
                    placeholder="Operational notes"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Create room</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card variant="card">
          <CardContent className="p-0">
            {rooms.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No rooms found"
                  description="Create buildings and room types first, then add rooms."
                />
              </div>
            ) : (
              <div className="table-shell rounded-none border-0 shadow-none">
                <div className="table-scroll">
                  <table className="data-table min-w-[1040px]">
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Camp</th>
                        <th>Building</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Room status</th>
                        <th>Condition</th>
                        <th>Flags</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.room_id}>
                          <td className="font-semibold text-foreground">
                            {room.room_number}
                          </td>

                          <td className="text-muted">{room.camp_name}</td>

                          <td className="text-muted">{room.building_name}</td>

                          <td className="text-muted">{room.room_type}</td>

                          <td className="text-muted">{room.capacity}</td>

                          <td>
                            <RoomStatusCell status={room.current_status} />
                          </td>

                          <td>
                            <StatusIndicator
                              label={formatLabel(room.condition_status)}
                              statusClassName={getConditionClass(
                                room.condition_status,
                              )}
                            />
                          </td>

                          <td>
                            <div className="flex flex-wrap gap-2">
                              {room.is_vip ? (
                                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                                  VIP
                                </span>
                              ) : null}

                              {room.is_delegate_suitable ? (
                                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                                  Delegate
                                </span>
                              ) : null}

                              {!room.is_vip && !room.is_delegate_suitable ? (
                                <span className="text-muted">—</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
