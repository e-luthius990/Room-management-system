// src/app/room-board/page.tsx

import Link from "next/link";
import { BedDouble } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  canSelectCampFilter,
  filterByCampAccess,
  getAssignedCampLabel,
} from "@/lib/auth/camp-scope";
import { RoomBoardClient } from "@/components/room-board/room-board-client";
import { getRoomBoard } from "@/lib/queries/room-board/get-room-board";
import { EmptyState } from "@/components/ui/EmptyState";
import { APP_ROUTES } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RoomBoardPage(): Promise<React.JSX.Element> {
  noStore();

  const currentUser = await requireAnyPermission([
    "rooms.view",
    "rooms.view_board",
  ]);

  const canUseCampSelect = canSelectCampFilter(currentUser.role.key);
  const assignedCampLabel = getAssignedCampLabel(currentUser.campAccess);
  const { rooms: loadedRooms } = await getRoomBoard();
  const rooms = canUseCampSelect
    ? loadedRooms
    : filterByCampAccess(loadedRooms, currentUser.campAccess);

  return (
    <div className="page-stack">
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
        <RoomBoardClient
          rooms={rooms}
          canSelectCamp={canUseCampSelect}
          assignedCampLabel={assignedCampLabel}
        />
      )}
    </div>
  );
}
