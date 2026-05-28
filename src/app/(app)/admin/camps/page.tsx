import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { createCampAction } from "@/lib/actions/setup/camps";
import { getCamps } from "@/lib/queries/setup/inventory";

type CampsPageProps = {
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
    invalid_input: "Check the camp name, code, location, and description.",
    duplicate_camp_code: "A camp with this code already exists.",
    access_denied: "You do not have access to create camps.",
    camp_create_failed: "Camp could not be created.",
  };

  return messages[error] ?? "Camp action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (success === "camp_created") {
    return "Camp created successfully.";
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

export default async function CampsPage({
  searchParams,
}: CampsPageProps): Promise<React.JSX.Element> {
  await requirePermission("camps.view");

  const [params, camps] = await Promise.all([searchParams, getCamps()]);

  const errorMessage = getErrorMessage(params?.error);
  const successMessage = getSuccessMessage(params?.success);

  return (
    <div>
      <PageHeader
        title="Camps"
        description="Manage company accommodation camps. These define the highest operational scope for rooms, users, guests, and workflows."
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
          action={createCampAction}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="camp-name"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Name
              </label>

              <input
                id="camp-name"
                required
                name="name"
                autoComplete="off"
                maxLength={120}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Airport Camp"
              />
            </div>

            <div>
              <label
                htmlFor="camp-code"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Code
              </label>

              <input
                id="camp-code"
                required
                name="code"
                autoComplete="off"
                maxLength={40}
                pattern="[A-Z0-9_-]+"
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-neutral-400"
                placeholder="AIRPORT"
              />
            </div>

            <div>
              <label
                htmlFor="camp-location"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Location
              </label>

              <input
                id="camp-location"
                name="location"
                autoComplete="off"
                maxLength={240}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Airport side camp"
              />
            </div>

            <div>
              <label
                htmlFor="camp-description"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Description
              </label>

              <textarea
                id="camp-description"
                name="description"
                rows={4}
                maxLength={240}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                placeholder="Optional description for internal users"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Create camp
          </button>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Camp</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {camps.map((camp) => (
                <tr key={camp.id}>
                  <td className="px-4 py-4 font-medium text-neutral-950">
                    {camp.name}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-neutral-700">
                    {camp.code}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    {camp.location ?? "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        statusTone(camp.status),
                      ].join(" ")}
                    >
                      {formatStatus(camp.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {camps.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No camps found.
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
