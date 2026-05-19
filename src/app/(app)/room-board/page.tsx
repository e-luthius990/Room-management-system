// src/app/room-board/page.tsx

import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { RoomBoardClient } from "@/components/room-board/room-board-client";
import { getRoomBoard } from "@/lib/queries/room-board/get-room-board";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/page-header";
import { APP_ROUTES } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RoomBoardPage(): Promise<React.JSX.Element> {
  noStore();

  await requireAnyPermission(["rooms.view", "rooms.view_board"]);

  const { rooms } = await getRoomBoard();

  return (
    <>
      <PageHeader
        kicker="Live room operations"
        title="Room board"
        description="Monitor room availability, occupancy, reservations, and checkout pressure across your accessible camps."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.rooms.list} className="btn-secondary">
              <BedDouble className="size-4" aria-hidden="true" />
              Rooms
            </Link>

            <Link href={APP_ROUTES.allocations.new} className="btn-primary">
              <Plus className="size-4" aria-hidden="true" />
              Allocate room
            </Link>
          </div>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          size="lg"
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
    </>
  );
}
