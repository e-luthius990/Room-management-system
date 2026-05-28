import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { createRoomTypeAction } from "@/lib/actions/setup/room-types";
import { getRoomTypes } from "@/lib/queries/setup/inventory";

type RoomTypesPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the room type key, name, and capacity.",
    duplicate_room_type: "A room type with this key already exists.",
    access_denied: "You do not have access to manage room types.",
    room_type_create_failed: "Room type could not be created.",
  };

  return messages[error] ?? "Room type action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (success === "room_type_created") {
    return "Room type created successfully.";
  }

  return null;
}

function statusTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-neutral-200 bg-neutral-50 text-neutral-600";
}

export default async function RoomTypesPage({
  searchParams,
}: RoomTypesPageProps): Promise<React.JSX.Element> {
  await requirePermission("settings.update_room_types");

  const [query, roomTypes] = await Promise.all([searchParams, getRoomTypes()]);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title="Room Types"
        description="Define room classifications used by reception, managers, and reporting."
      />

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          action={createRoomTypeAction}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="room-type-key"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Key
              </label>

              <input
                id="room-type-key"
                required
                name="key"
                autoComplete="off"
                maxLength={60}
                pattern="[a-z0-9_]+"
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="executive_single"
              />
            </div>

            <div>
              <label
                htmlFor="room-type-name"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Name
              </label>

              <input
                id="room-type-name"
                required
                name="name"
                autoComplete="off"
                maxLength={120}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Executive Single"
              />
            </div>

            <div>
              <label
                htmlFor="room-type-default-capacity"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Default capacity
              </label>

              <input
                id="room-type-default-capacity"
                name="defaultCapacity"
                type="number"
                min={1}
                max={50}
                step={1}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="1"
              />
            </div>

            <div>
              <label
                htmlFor="room-type-description"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Description
              </label>

              <textarea
                id="room-type-description"
                name="description"
                rows={3}
                maxLength={240}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Optional description"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Create room type
          </button>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {roomTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-4 py-4 font-medium text-neutral-950">
                    {type.name}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-neutral-700">
                    {type.key}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    {type.default_capacity ?? "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        statusTone(type.is_active),
                      ].join(" ")}
                    >
                      {type.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {roomTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No room types found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
