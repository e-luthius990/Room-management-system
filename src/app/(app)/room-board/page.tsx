// src/app/room-board/page.tsx

import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { RoomBoardClient } from "@/components/room-board/room-board-client";
import { getRoomBoard } from "@/lib/queries/room-board/get-room-board";
import { EmptyState } from "@/components/ui/EmptyState";
import { APP_ROUTES } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RoomBoardPage(): Promise<React.JSX.Element> {
  noStore();

  await requireAnyPermission(["rooms.view", "rooms.view_board"]);

  const { rooms } = await getRoomBoard();

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Live room operations</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              Room board
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Monitor availability, occupancy, reservations, field absences,
              checkout pressure, and blocked rooms across your accessible camps.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.allocations.new} className="btn-primary">
              <Plus className="size-4" aria-hidden="true" />
              Allocate room
            </Link>
          </div>
        </div>
      </section>

      {rooms.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          icon={<BedDouble className="size-5" />}
          title="No rooms available"
          description="No rooms are available for your current camp access. Confirm that rooms exist, are assigned to camps, and your role has access to those camps."
          action={
            <Link href={APP_ROUTES.rooms.list} className="btn-primary">
              View rooms
            </Link>
          }
        />
      ) : (
        <RoomBoardClient rooms={rooms} />
      )}
    </div>
  );
}
