import type { JSX } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const AVAILABLE_ROOMS_PERMISSIONS = ["rooms.view", "rooms.view_board"] as const;

type AvailableRoomRow = {
  room_id: string | null;
  room_number: string | null;
  camp_id: string | null;
  camp_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_type: string | null;
  capacity: number | null;
  current_status: string | null;
  condition_status: string | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
};

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value: string | null): string {
  switch (value) {
    case "vacant_ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "reserved":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "manager_hold":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "out_of_service":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

async function getAvailableRooms(): Promise<AvailableRoomRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_board_view")
    .select(
      [
        "room_id",
        "room_number",
        "camp_id",
        "camp_name",
        "building_id",
        "building_name",
        "room_type",
        "capacity",
        "current_status",
        "condition_status",
        "is_vip",
        "is_delegate_suitable",
      ].join(","),
    )
    .eq("current_status", "vacant_ready")
    .order("room_number", { ascending: true })
    .returns<AvailableRoomRow[]>();

  if (error) {
    throw new Error(`Failed to load available rooms: ${error.message}`);
  }

  return data ?? [];
}

export default async function ManagerAvailableRoomsPage(): Promise<JSX.Element> {
  await requireAnyPermission([...AVAILABLE_ROOMS_PERMISSIONS]);

  const rooms = await getAvailableRooms();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Available rooms"
        description="Vacant rooms ready for allocation, including camp, building, room type, capacity, and suitability indicators."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={APP_ROUTES.manager.home}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
            >
              Back to dashboard
            </Link>

            <Link
              href={APP_ROUTES.manager.rooms.board}
              className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              Room board
            </Link>
          </div>
        }
      />

      <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Available room register
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {rooms.length} vacant ready room
              {rooms.length === 1 ? "" : "s"}.
            </p>
          </div>

          <Link
            href={APP_ROUTES.allocations.new}
            className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Allocate room
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500">
            No rooms are currently available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Camp</th>
                  <th className="px-5 py-3 font-semibold">Building</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Capacity</th>
                  <th className="px-5 py-3 font-semibold">Suitability</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {rooms.map((room) => (
                  <tr
                    key={room.room_id ?? room.room_number}
                    className="transition hover:bg-neutral-50/70"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-xl bg-neutral-100 px-2.5 py-1 text-sm font-semibold text-neutral-950">
                        {room.room_number ?? "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {room.camp_name ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {room.building_name ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {room.room_type ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {room.capacity ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {room.is_vip ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            VIP
                          </span>
                        ) : null}

                        {room.is_delegate_suitable ? (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                            Delegate suitable
                          </span>
                        ) : null}

                        {!room.is_vip && !room.is_delegate_suitable ? (
                          <span className="text-sm text-neutral-500">—</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusTone(room.current_status),
                        )}
                      >
                        {formatLabel(room.current_status)}
                      </span>
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
