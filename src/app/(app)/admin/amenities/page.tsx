import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { createAmenityAction } from "@/lib/actions/setup/amenities";
import { getAmenities } from "@/lib/queries/setup/inventory";

type AmenitiesPageProps = {
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
    invalid_input: "Check the amenity key and name, then try again.",
    duplicate_amenity: "An amenity with this key already exists.",
    access_denied: "You do not have access to manage amenities.",
    amenity_create_failed: "Amenity could not be created.",
  };

  return messages[error] ?? "Amenity action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (success === "amenity_created") {
    return "Amenity created successfully.";
  }

  return null;
}

function statusTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-neutral-200 bg-neutral-50 text-neutral-600";
}

export default async function AmenitiesPage({
  searchParams,
}: AmenitiesPageProps): Promise<React.JSX.Element> {
  await requirePermission("rooms.manage_amenities");

  const [query, amenities] = await Promise.all([searchParams, getAmenities()]);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title="Amenities"
        description="Manage active room amenities that can be assigned to rooms."
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
          action={createAmenityAction}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="amenity-key"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Key
              </label>

              <input
                id="amenity-key"
                required
                name="key"
                autoComplete="off"
                maxLength={60}
                pattern="[a-z0-9_]+"
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="hot_water"
              />
            </div>

            <div>
              <label
                htmlFor="amenity-name"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Name
              </label>

              <input
                id="amenity-name"
                required
                name="name"
                autoComplete="off"
                maxLength={120}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Hot water"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Create amenity
          </button>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {amenities.map((amenity) => (
                <tr key={amenity.id}>
                  <td className="px-4 py-4 font-medium text-neutral-950">
                    {amenity.name}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-neutral-700">
                    {amenity.key}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        statusTone(amenity.is_active),
                      ].join(" ")}
                    >
                      {amenity.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {amenities.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No amenities found.
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
