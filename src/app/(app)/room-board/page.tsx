import { requirePermission } from "@/lib/auth/require-permission";
import { RoomBoardClient } from "@/components/room-board/room-board-client";
import { getRoomBoard } from "@/lib/queries/room-board/get-room-board";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function RoomBoardPage(): Promise<React.JSX.Element> {
  await requirePermission("rooms.view");

  const { rooms } = await getRoomBoard();

  return (
    <div className="page-stack">
      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms available"
          description="No rooms are available for your current camp access."
        />
      ) : (
        <RoomBoardClient rooms={rooms} />
      )}
    </div>
  );
}
