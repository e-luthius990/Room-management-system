import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";
import { getManagerCurrentGuests } from "@/lib/queries/manager/get-manager-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ManagerCurrentGuestsPage(): Promise<React.JSX.Element> {
  await requireAnyPermission(["stays.view_current", "stays.view"]);

  const guests = await getManagerCurrentGuests(150);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Checked-in guests"
        description="Guests currently checked in, with assigned room, stay status, security presence, and arrival time."
        actions={
          <Link
            href={APP_ROUTES.manager.home}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to dashboard
          </Link>
        }
      />

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        {guests.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500">
            No guests are currently checked in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Camp</th>
                  <th className="px-5 py-3 font-semibold">Assigned room</th>
                  <th className="px-5 py-3 font-semibold">Stay status</th>
                  <th className="px-5 py-3 font-semibold">Security presence</th>
                  <th className="px-5 py-3 font-semibold">Arrival time</th>
                  <th className="px-5 py-3 font-semibold">
                    Expected departure
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {guests.map((guest) => (
                  <tr key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-neutral-950">
                        {guest.guest_name ?? "Unnamed guest"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {[guest.organization, guest.guest_category]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {guest.camp_name ?? "—"}
                    </td>

                    <td className="px-5 py-4 font-medium text-neutral-950">
                      {guest.room_number ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatLabel(guest.stay_status)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatLabel(guest.security_presence_status)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatDateTime(guest.arrival_time)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatDateTime(guest.expected_departure_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
