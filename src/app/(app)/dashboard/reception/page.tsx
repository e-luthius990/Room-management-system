import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type CountResult = {
  count: number | null;
  error: unknown;
};

type QueueItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
};

type ReceptionistDashboardData = {
  arrivalsToday: number;
  departuresToday: number;
  pendingReservations: number;
  activeStays: number;
  arrivals: QueueItem[];
  departures: QueueItem[];
};

function getDayBounds(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function getCount(query: PromiseLike<CountResult>): Promise<number> {
  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function relatedRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

function textValue(value: unknown, fallback = "—"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

function formatTime(value: unknown): string {
  if (typeof value !== "string") {
    return "Time not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function getReceptionistDashboardData(): Promise<ReceptionistDashboardData> {
  const supabase = await createServerSupabaseClient();
  const { start, end } = getDayBounds();

  const [
    arrivalsToday,
    departuresToday,
    pendingReservations,
    activeStays,
    arrivalsResult,
    departuresResult,
  ] = await Promise.all([
    getCount(
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .gte("expected_arrival_at", start)
        .lt("expected_arrival_at", end)
        .in("status", ["pending", "confirmed"]),
    ),

    getCount(
      supabase
        .from("stays")
        .select("id", { count: "exact", head: true })
        .gte("expected_departure_at", start)
        .lt("expected_departure_at", end)
        .in("status", ["checked_in", "occupied"]),
    ),

    getCount(
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "confirmed"]),
    ),

    getCount(
      supabase
        .from("stays")
        .select("id", { count: "exact", head: true })
        .in("status", ["checked_in", "occupied"]),
    ),

    supabase
      .from("reservations")
      .select(
        `
          id,
          expected_arrival_at,
          status,
          guest:guests(full_name, organization, is_vip),
          room:rooms(
            room_number,
            building:buildings(name, code)
          )
        `,
      )
      .gte("expected_arrival_at", start)
      .lt("expected_arrival_at", end)
      .in("status", ["pending", "confirmed"])
      .order("expected_arrival_at", { ascending: true })
      .limit(6),

    supabase
      .from("stays")
      .select(
        `
          id,
          expected_departure_at,
          status,
          guest:guests(full_name, organization, is_vip),
          room:rooms(
            room_number,
            building:buildings(name, code)
          )
        `,
      )
      .gte("expected_departure_at", start)
      .lt("expected_departure_at", end)
      .in("status", ["checked_in", "occupied"])
      .order("expected_departure_at", { ascending: true })
      .limit(6),
  ]);

  const arrivalRows = Array.isArray(arrivalsResult.data)
    ? arrivalsResult.data
    : [];

  const departureRows = Array.isArray(departuresResult.data)
    ? departuresResult.data
    : [];

  const arrivals: QueueItem[] = arrivalRows.map((item) => {
    const row = asRecord(item);
    const guest = relatedRecord(row.guest);
    const room = relatedRecord(row.room);
    const building = relatedRecord(room.building);

    const id = textValue(row.id);
    const guestName = textValue(guest.full_name, "Unnamed guest");
    const roomNumber = textValue(room.room_number, "No room");
    const buildingName = textValue(building.code, textValue(building.name));
    const status = textValue(row.status, "pending");

    return {
      id,
      title: guestName,
      subtitle: `Room ${roomNumber} · ${buildingName}`,
      meta: `${formatTime(row.expected_arrival_at)} · ${formatLabel(status)}`,
    };
  });

  const departures: QueueItem[] = departureRows.map((item) => {
    const row = asRecord(item);
    const guest = relatedRecord(row.guest);
    const room = relatedRecord(row.room);
    const building = relatedRecord(room.building);

    const id = textValue(row.id);
    const guestName = textValue(guest.full_name, "Unnamed guest");
    const roomNumber = textValue(room.room_number, "No room");
    const buildingName = textValue(building.code, textValue(building.name));

    return {
      id,
      title: guestName,
      subtitle: `Room ${roomNumber} · ${buildingName}`,
      meta: `${formatTime(row.expected_departure_at)} · Due checkout`,
    };
  });

  return {
    arrivalsToday,
    departuresToday,
    pendingReservations,
    activeStays,
    arrivals,
    departures,
  };
}

function CompactMetric({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "default" | "warning" | "success";
}): React.JSX.Element {
  const toneClass = {
    default: "border-border bg-surface",
    warning: "border-warning-700/25 bg-warning-50",
    success: "border-success-600/25 bg-success-50",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>

      <div className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground">
        {value}
      </div>

      <div className="mt-0.5 text-xs leading-5 text-muted">{note}</div>
    </div>
  );
}

function DashboardHero({
  data,
}: {
  data: ReceptionistDashboardData;
}): React.JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)] xl:items-end">
        <div className="min-w-0">
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
            Reception desk
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Today’s arrivals, departures, pending reservations, and active
            in-house stays.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <CompactMetric
            label="Arrivals"
            value={data.arrivalsToday}
            note="Expected today"
          />

          <CompactMetric
            label="Departures"
            value={data.departuresToday}
            note="Due today"
          />

          <CompactMetric
            label="Pending"
            value={data.pendingReservations}
            note="Reservations"
            tone={data.pendingReservations > 0 ? "warning" : "default"}
          />

          <CompactMetric
            label="In house"
            value={data.activeStays}
            note="Active stays"
            tone={data.activeStays > 0 ? "success" : "default"}
          />
        </div>
      </div>
    </section>
  );
}

function QueuePanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: QueueItem[];
}): React.JSX.Element {
  return (
    <Card variant="card">
      <CardHeader className="px-4 py-3 sm:px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs leading-5">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {items.length > 0 ? (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {item.title}
                  </div>

                  <div className="mt-0.5 truncate text-xs leading-5 text-muted">
                    {item.subtitle}
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs font-semibold leading-5 text-muted">
                  {item.meta}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-4">
            <EmptyState
              size="sm"
              title={emptyTitle}
              description={emptyDescription}
              className="rounded-2xl p-4"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function ReceptionistDashboard(): Promise<React.JSX.Element> {
  const data = await getReceptionistDashboardData();

  return (
    <div className="page-stack">
      <DashboardHero data={data} />

      <div className="grid gap-4 xl:grid-cols-2">
        <QueuePanel
          title="Arrivals due today"
          description="Reservations that need confirmation or check-in."
          emptyTitle="No arrivals due today"
          emptyDescription="Expected arrivals will appear here once confirmed for today."
          items={data.arrivals}
        />

        <QueuePanel
          title="Departures due today"
          description="Guests expected to check out before end of day."
          emptyTitle="No departures due today"
          emptyDescription="Departures appear here when their expected checkout is today."
          items={data.departures}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const currentUser = await requireAuth();

  if (currentUser.role.key !== "receptionist") {
    notFound();
  }

  return <ReceptionistDashboard />;
}
