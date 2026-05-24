import Link from "next/link";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CampAccessLevel, CurrentUserContext } from "@/lib/auth/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpectedArrivalForm } from "@/components/expected-arrivals/expected-arrival-form";

type CampOption = {
  id: string;
  name: string;
};

type GuestOption = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  phone: string | null;
  email: string | null;
  organization: string | null;
};

const CAMP_ACCESS_RANK: Record<CampAccessLevel, number> = {
  viewer: 1,
  operator: 2,
  supervisor: 3,
  manager: 4,
  admin: 5,
};

function getWritableCampIds(currentUser: CurrentUserContext): string[] | null {
  if (currentUser.isSystemActor) {
    return null;
  }

  return currentUser.campAccess
    .filter(
      (access) =>
        CAMP_ACCESS_RANK[access.access_level] >= CAMP_ACCESS_RANK.operator,
    )
    .map((access) => access.camp_id);
}

async function getFormOptions(currentUser: CurrentUserContext): Promise<{
  camps: CampOption[];
  guests: GuestOption[];
}> {
  const supabase = await createServerSupabaseClient();
  const writableCampIds = getWritableCampIds(currentUser);

  if (writableCampIds !== null && writableCampIds.length === 0) {
    return {
      camps: [],
      guests: [],
    };
  }

  let campsQuery = supabase
    .from("camps")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  let guestsQuery = supabase
    .from("guests")
    .select("id, full_name, primary_camp_id, phone, email, organization")
    .is("archived_at", null)
    .order("full_name", { ascending: true });

  if (writableCampIds !== null) {
    campsQuery = campsQuery.in("id", writableCampIds);
    guestsQuery = guestsQuery.in("primary_camp_id", writableCampIds);
  }

  const [
    { data: camps, error: campsError },
    { data: guests, error: guestsError },
  ] = await Promise.all([campsQuery, guestsQuery]);

  if (campsError) {
    throw new Error(campsError.message);
  }

  if (guestsError) {
    throw new Error(guestsError.message);
  }

  return {
    camps: camps ?? [],
    guests: guests ?? [],
  };
}

export default async function NewExpectedArrivalPage(): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("expected_arrivals.create");

  const { camps, guests } = await getFormOptions(currentUser);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Reception arrival setup</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              Create expected arrival
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Register a guest before room allocation so security and reception
              can prepare arrival handling, clearance, host routing, and room
              assignment.
            </p>
          </div>

          <Link
            href={APP_ROUTES.reception.expectedArrivals}
            className="btn-secondary"
          >
            Back to expected arrivals
          </Link>
        </div>
      </section>

      {camps.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          title="No writable camp access"
          description="Your account does not have operator access to any active camp for creating expected arrivals."
        />
      ) : (
        <ExpectedArrivalForm camps={camps} guests={guests} />
      )}
    </div>
  );
}
