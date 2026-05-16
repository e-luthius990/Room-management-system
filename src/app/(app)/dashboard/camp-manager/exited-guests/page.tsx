import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";
import { getManagerExitedGuests } from "@/lib/queries/manager/get-manager-dashboard";

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

export default async function ManagerExitedGuestsPage(): Promise<React.JSX.Element> {
  await requireAnyPermission(["stays.view_history", "stays.view"]);

  const guests = await getManagerExitedGuests(150);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Exited guests"
        description="Guests who checked out or were marked as left by security, with previous room and departure or exit time."
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
            No exited guests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Previous room</th>
                  <th className="px-5 py-3 font-semibold">Stay status</th>
                  <th className="px-5 py-3 font-semibold">Exit source</th>
                  <th className="px-5 py-3 font-semibold">
                    Departure / exit time
                  </th>
                  <th className="px-5 py-3 font-semibold">Checked in</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {guests.map((guest) => (
                  <tr
                    key={[
                      guest.stay_id,
                      guest.guest_id,
                      guest.departure_or_exit_time,
                    ]
                      .filter(Boolean)
                      .join("-")}
                  >
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

                    <td className="px-5 py-4 font-medium text-neutral-950">
                      {guest.room_number ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatLabel(guest.stay_status)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatLabel(guest.exit_source)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatDateTime(guest.departure_or_exit_time)}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {formatDateTime(guest.checked_in_at)}
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
