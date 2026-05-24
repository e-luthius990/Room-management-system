import type { JSX } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getManagerCurrentGuests } from "@/lib/queries/manager/get-manager-dashboard";
import { cn } from "@/lib/utils/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CURRENT_GUESTS_PERMISSIONS = [
  "stays.view_current",
  "stays.view",
] as const;

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

function presenceTone(value: string | null): string {
  switch (value) {
    case "in_camp":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "exited":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "sent_to_reception":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function stayTone(value: string | null): string {
  switch (value) {
    case "checked_in":
    case "occupied":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "reserved":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "completed":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "cancelled":
    case "no_show":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export default async function ManagerCurrentGuestsPage(): Promise<JSX.Element> {
  await requireAnyPermission([...CURRENT_GUESTS_PERMISSIONS]);

  const guests = await getManagerCurrentGuests(150);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Checked-in guests"
        description="Guests currently checked in, with assigned rooms, camp location, stay status, security presence, and expected departure."
        actions={
          <Link
            href={APP_ROUTES.manager.home}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
          >
            Back to dashboard
          </Link>
        }
      />

      <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Current stays
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {guests.length} active checked-in guest
              {guests.length === 1 ? "" : "s"}.
            </p>
          </div>

          <Link
            href={APP_ROUTES.manager.rooms.board}
            className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Open room board
          </Link>
        </div>

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
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Stay status</th>
                  <th className="px-5 py-3 font-semibold">Security presence</th>
                  <th className="px-5 py-3 font-semibold">Arrival</th>
                  <th className="px-5 py-3 font-semibold">
                    Expected departure
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {guests.map((guest) => (
                  <tr
                    key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}
                    className="transition hover:bg-neutral-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-neutral-950">
                          {guest.guest_name ?? "Unnamed guest"}
                        </div>

                        {guest.is_vip ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            VIP
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {[guest.organization, formatLabel(guest.guest_category)]
                          .filter((value) => value && value !== "—")
                          .join(" · ") || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {guest.camp_name ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-xl bg-neutral-100 px-2.5 py-1 text-sm font-semibold text-neutral-950">
                        {guest.room_number ?? "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          stayTone(guest.stay_status),
                        )}
                      >
                        {formatLabel(guest.stay_status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          presenceTone(guest.security_presence_status),
                        )}
                      >
                        {formatLabel(guest.security_presence_status)}
                      </span>
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
