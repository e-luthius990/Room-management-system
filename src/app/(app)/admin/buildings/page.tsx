import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { createBuildingAction } from "@/lib/actions/setup/buildings";
import { getCampOptions } from "@/lib/queries/setup/options";
import { getBuildings } from "@/lib/queries/setup/inventory";

type BuildingsPageProps = {
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
    invalid_input: "Check the building details and try again.",
    camp_not_allowed: "You do not have manager access to that camp.",
    invalid_camp: "Selected camp is invalid.",
    invalid_building: "Building could not be created.",
    access_denied: "You do not have access to create buildings.",
    building_create_failed: "Building could not be created.",
  };

  return messages[error] ?? "Building action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (success === "building_created") {
    return "Building created successfully.";
  }

  return null;
}

function formatStatus(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "inactive":
    case "disabled":
      return "border-neutral-200 bg-neutral-50 text-neutral-600";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export default async function BuildingsPage({
  searchParams,
}: BuildingsPageProps): Promise<React.JSX.Element> {
  await requirePermission("buildings.view");

  const [query, camps, buildings] = await Promise.all([
    searchParams,
    getCampOptions(),
    getBuildings(),
  ]);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title="Buildings"
        description="Create buildings or blocks under each camp before adding individual rooms."
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
          action={createBuildingAction}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-neutral-950">
            Add building
          </h2>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Buildings belong to a camp and are used to organize room inventory.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="building-camp-id"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Camp
              </label>

              <select
                id="building-camp-id"
                required
                name="campId"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                defaultValue=""
              >
                <option disabled value="">
                  Select camp
                </option>

                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="building-name"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Name
              </label>

              <input
                id="building-name"
                required
                name="name"
                autoComplete="off"
                maxLength={120}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Main Block"
              />
            </div>

            <div>
              <label
                htmlFor="building-code"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Code
              </label>

              <input
                id="building-code"
                required
                name="code"
                autoComplete="off"
                maxLength={40}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="A"
              />
            </div>

            <div>
              <label
                htmlFor="building-floor-count"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Floor count
              </label>

              <input
                id="building-floor-count"
                name="floorCount"
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="2"
              />
            </div>

            <div>
              <label
                htmlFor="building-description"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Description
              </label>

              <textarea
                id="building-description"
                name="description"
                rows={3}
                maxLength={240}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Optional notes about this building or block"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Create building
          </button>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Building</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Camp</th>
                <th className="px-4 py-3">Floors</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {buildings.map((building) => (
                <tr key={building.id}>
                  <td className="px-4 py-4 font-medium text-neutral-950">
                    {building.name}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-neutral-700">
                    {building.code}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    {building.camp_name}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    {building.floor_count ?? "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        statusTone(building.status),
                      ].join(" ")}
                    >
                      {formatStatus(building.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {buildings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No buildings found.
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
