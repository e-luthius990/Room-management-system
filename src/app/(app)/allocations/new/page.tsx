import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  getAllocationGuests,
  getReadyAllocationRooms,
} from "@/lib/queries/allocations/allocations";
import { AllocationForm } from "@/components/allocation/allocation-form";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NewAllocationPage(): Promise<React.JSX.Element> {
  await requireAnyPermission(["allocations.create"]);

  const [guests, rooms] = await Promise.all([
    getAllocationGuests(),
    getReadyAllocationRooms(),
  ]);

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="max-w-3xl">
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
            Assign room
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Select a guest, choose the stay window, then assign a vacant ready
            room. Reception can allocate rooms here without managing room setup.
          </p>
        </div>
      </section>

      {guests.length === 0 ? (
        <EmptyState
          title="No guests available"
          description="Create or link a guest record before allocating a room."
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          title="No vacant ready rooms available"
          description="Only rooms currently marked vacant ready appear here for allocation."
        />
      ) : (
        <Card variant="card">
          <CardContent>
            <AllocationForm guests={guests} rooms={rooms} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
