import { notFound } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  canSelectCampFilter,
  filterByCampAccess,
  filterByPrimaryCampAccess,
  getAssignedCampLabel,
} from "@/lib/auth/camp-scope";
import {
  getAllocationGuests,
  getReadyAllocationRooms,
} from "@/lib/queries/allocations/allocations";
import { getExpectedArrivalById } from "@/lib/queries/expected-arrivals";
import { AllocationForm } from "@/components/allocation/allocation-form";
import { ExpectedArrivalAllocationForm } from "@/components/allocation/expected-arrival-allocation-form";
import { EmptyState } from "@/components/ui/EmptyState";

type NewAllocationPageProps = {
  searchParams?: Promise<{
    expectedArrivalId?: string | string[];
  }>;
};

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAllocationPage({
  searchParams,
}: NewAllocationPageProps): Promise<React.JSX.Element> {
  const params = searchParams ? await searchParams : undefined;
  const expectedArrivalId = singleParam(params?.expectedArrivalId);

  if (expectedArrivalId) {
    await requireAnyPermission(["expected_arrivals.allocate"]);

    const [expectedArrival, rooms] = await Promise.all([
      getExpectedArrivalById(expectedArrivalId),
      getReadyAllocationRooms(),
    ]);

    if (!expectedArrival) {
      notFound();
    }

    const canAllocate =
      expectedArrival.status === "expected" ||
      expectedArrival.status === "arrived";

    const availableRooms = rooms.filter(
      (room) => room.camp_id === expectedArrival.camp_id,
    );

    return (
      <div className="page-stack">
        {!canAllocate ? (
          <EmptyState
            operational
            align="left"
            size="sm"
            tone="warning"
            title="This expected arrival cannot be allocated"
            description="Only expected or arrived records can be allocated."
          />
        ) : !expectedArrival.guest_id ? (
          <EmptyState
            operational
            align="left"
            size="sm"
            tone="warning"
            title="Guest is missing"
            description="This expected arrival must have a guest before room allocation."
          />
        ) : availableRooms.length === 0 ? (
          <EmptyState
            operational
            align="left"
            size="sm"
            title="No vacant-ready rooms available"
            description="No vacant-ready rooms are available in this expected arrival's camp."
          />
        ) : (
          <ExpectedArrivalAllocationForm
            expectedArrival={expectedArrival}
            rooms={availableRooms}
          />
        )}
      </div>
    );
  }

  const currentUser = await requireAnyPermission(["allocations.create"]);
  const canUseCampSelect = canSelectCampFilter(currentUser.role.key);
  const assignedCampLabel = getAssignedCampLabel(currentUser.campAccess);

  const [loadedGuests, loadedRooms] = await Promise.all([
    getAllocationGuests(),
    getReadyAllocationRooms(),
  ]);

  const rooms = canUseCampSelect
    ? loadedRooms
    : filterByCampAccess(loadedRooms, currentUser.campAccess);
  const guests = canUseCampSelect
    ? loadedGuests
    : filterByPrimaryCampAccess(loadedGuests, currentUser.campAccess);

  return (
    <div className="page-stack">
      {guests.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          title="No guests available"
          description="Create or link a guest record before allocating a room."
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          title="No vacant-ready rooms available"
          description="Only rooms currently marked vacant-ready appear here for allocation."
        />
      ) : (
        <AllocationForm
          guests={guests}
          rooms={rooms}
          canSelectCamp={canUseCampSelect}
          assignedCampLabel={assignedCampLabel}
        />
      )}
    </div>
  );
}
