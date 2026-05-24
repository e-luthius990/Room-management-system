import { notFound } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth/require-permission";
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

function AllocationPageHeader({
  mode,
}: {
  mode: "standard" | "expected-arrival";
}): React.JSX.Element {
  const isExpectedArrival = mode === "expected-arrival";

  return (
    <section className="surface-panel overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="max-w-3xl">
          <div className="page-kicker">
            {isExpectedArrival
              ? "Expected arrival allocation"
              : "Reception allocation"}
          </div>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
            {isExpectedArrival
              ? "Allocate room for expected arrival"
              : "Assign room"}
          </h1>

          <p className="mt-1.5 text-sm leading-6 text-muted">
            {isExpectedArrival
              ? "Select a vacant-ready room for the expected arrival. Guest and stay window are prefilled from the arrival record."
              : "Select the guest, choose a vacant-ready room, then confirm the stay window and allocation details."}
          </p>
        </div>
      </div>
    </section>
  );
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
        <AllocationPageHeader mode="expected-arrival" />

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

  await requireAnyPermission(["allocations.create"]);

  const [guests, rooms] = await Promise.all([
    getAllocationGuests(),
    getReadyAllocationRooms(),
  ]);

  return (
    <div className="page-stack">
      <AllocationPageHeader mode="standard" />

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
        <AllocationForm guests={guests} rooms={rooms} />
      )}
    </div>
  );
}
