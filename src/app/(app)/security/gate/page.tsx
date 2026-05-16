import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getGateDashboard } from "@/lib/queries/security/get-gate-dashboard";
import { SecurityPresenceCard } from "@/components/security/security-presence-card";
import {
  ClearanceStatusBadge,
  PresenceBadge,
} from "@/components/security/security-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function GateOperationsPage(): Promise<React.JSX.Element> {
  await requirePermission("security.view_gate_dashboard");
  await requirePermission("security.view_clearance");
  await requirePermission("guests.view");

  const gateDashboard = await getGateDashboard();

  const expectedArrivals = gateDashboard.expectedArrivals ?? [];
  const activeStays = gateDashboard.activeStays ?? [];
  const peopleInside = gateDashboard.peopleInside ?? [];
  const pendingReception = gateDashboard.pendingReception ?? [];
  const departedToday = gateDashboard.departedToday ?? [];

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="page-kicker">Gate desk</div>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
              Gate operations
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Record physical entry, monitor who is inside, send eligible guests
              to reception, and confirm physical exits.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.security.review} className="btn-secondary">
              Security review
            </Link>

            <Link
              href={APP_ROUTES.security.pendingReception}
              className="btn-primary"
            >
              Pending reception
            </Link>
          </div>
        </div>
      </section>

      <Card variant="card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>People currently inside</CardTitle>
              <CardDescription>
                Open gate entries. Mark a guest as left once they physically
                exit.
              </CardDescription>
            </div>

            <PresenceBadge isInside={peopleInside.length > 0} />
          </div>
        </CardHeader>

        <CardContent>
          {peopleInside.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {peopleInside.map((item) => (
                <SecurityPresenceCard
                  key={item.security_event_id}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No one is currently recorded inside"
              description="When security records a gate entry, the guest will appear here until marked as left."
            />
          )}
        </CardContent>
      </Card>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Pending reception handoff</CardTitle>
          <CardDescription>
            Guests already sent forward to reception for the next handling step.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {pendingReception.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {pendingReception.map((item) => (
                <SecurityPresenceCard
                  key={item.security_event_id}
                  item={item}
                  showSendToReceptionAction={false}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No guests pending reception"
              description="Guests sent from security to reception will appear here for follow-up."
            />
          )}
        </CardContent>
      </Card>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Expected arrivals</CardTitle>
          <CardDescription>
            Reservations expected today with room assignment and clearance
            posture.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="table-shell rounded-none border-0 shadow-none">
            <div className="table-scroll">
              <table className="data-table min-w-[1000px]">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Camp / Room</th>
                    <th>Expected arrival</th>
                    <th>Expected departure</th>
                    <th>Clearance</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {expectedArrivals.map((arrival) => (
                    <tr key={arrival.reservation_id}>
                      <td>
                        <div className="font-semibold text-foreground">
                          {arrival.guest_name ?? "Guest not assigned"}
                        </div>

                        <div className="mt-1 text-xs text-muted">
                          {arrival.organization_name ??
                            formatLabel(arrival.guest_category)}
                        </div>
                      </td>

                      <td className="text-muted">
                        <div>{arrival.camp_name}</div>

                        <div className="mt-1 text-xs text-muted">
                          {arrival.building_name} / Room {arrival.room_number}
                        </div>
                      </td>

                      <td className="text-muted">
                        {formatDateTime(arrival.expected_arrival_at)}
                      </td>

                      <td className="text-muted">
                        {formatDateTime(arrival.expected_departure_at)}
                      </td>

                      <td>
                        <ClearanceStatusBadge
                          status={arrival.security_clearance_status}
                        />
                      </td>

                      <td className="text-right">
                        {arrival.guest_id ? (
                          <Link
                            href={APP_ROUTES.security.guestProfile(
                              arrival.guest_id,
                            )}
                            className="btn-secondary btn-sm"
                          >
                            Review
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {expectedArrivals.length === 0 ? (
                    <tr className="table-empty-row">
                      <td colSpan={6}>No expected arrivals today.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Active room stays</CardTitle>
          <CardDescription>
            Guests currently checked in or occupying rooms. Physical exit is
            confirmed by security.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="table-shell rounded-none border-0 shadow-none">
            <div className="table-scroll">
              <table className="data-table min-w-[1000px]">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Camp / Room</th>
                    <th>Checked in</th>
                    <th>Expected departure</th>
                    <th>Clearance</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {activeStays.map((stay) => (
                    <tr key={stay.stay_id}>
                      <td>
                        <div className="font-semibold text-foreground">
                          {stay.guest_name}
                        </div>

                        <div className="mt-1 text-xs text-muted">
                          {stay.organization_name ??
                            formatLabel(stay.guest_category)}
                        </div>
                      </td>

                      <td className="text-muted">
                        <div>{stay.camp_name}</div>

                        <div className="mt-1 text-xs text-muted">
                          {stay.building_name} / Room {stay.room_number}
                        </div>
                      </td>

                      <td className="text-muted">
                        {formatDateTime(stay.checked_in_at)}
                      </td>

                      <td className="text-muted">
                        {formatDateTime(stay.expected_departure_at)}
                      </td>

                      <td>
                        <ClearanceStatusBadge
                          status={stay.security_clearance_status}
                        />
                      </td>

                      <td className="text-right">
                        <Link
                          href={APP_ROUTES.security.guestProfile(stay.guest_id)}
                          className="btn-secondary btn-sm"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {activeStays.length === 0 ? (
                    <tr className="table-empty-row">
                      <td colSpan={6}>
                        No active stays currently visible to security.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Departed today</CardTitle>
          <CardDescription>
            Guests whose physical exit was confirmed by security today.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {departedToday.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {departedToday.map((item) => (
                <SecurityPresenceCard
                  key={item.security_event_id}
                  item={item}
                  showExitAction={false}
                  showSendToReceptionAction={false}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No departures recorded today"
              description="When security confirms a guest has physically left, the record will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
