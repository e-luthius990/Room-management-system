"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock3,
  DoorOpen,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";

import { APP_ROUTES } from "@/lib/auth/routes";
import type {
  ManagerCampSummary,
  ManagerCurrentGuestRow,
  ManagerDashboardData,
  ManagerExitedGuestRow,
  ManagerOperationalSummary,
} from "@/lib/queries/manager/get-manager-dashboard";
import { cn } from "@/lib/utils/cn";

type LiveState = {
  data: ManagerDashboardData;
  isRefreshing: boolean;
  isLive: boolean;
  error: string | null;
};

type DashboardApiError = {
  ok: false;
  error?: string;
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type MetricTone = "blue" | "emerald" | "amber" | "red" | "neutral";
type ProgressTone = MetricTone;

type MetricCardProps = {
  label: string;
  value: number | string;
  helper: string;
  href?: string;
  icon: IconComponent;
  tone?: MetricTone;
};

const REFRESH_INTERVAL_MS = 30_000;

function isDashboardApiError(
  payload: ManagerDashboardData | DashboardApiError,
): payload is DashboardApiError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    payload.ok === false
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function metricToneClasses(tone: MetricTone): {
  icon: string;
  value: string;
  panel: string;
} {
  switch (tone) {
    case "emerald":
      return {
        icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        value: "text-emerald-700",
        panel: "hover:border-emerald-200",
      };
    case "amber":
      return {
        icon: "bg-amber-50 text-amber-700 ring-amber-100",
        value: "text-amber-700",
        panel: "hover:border-amber-200",
      };
    case "red":
      return {
        icon: "bg-red-50 text-red-700 ring-red-100",
        value: "text-red-700",
        panel: "hover:border-red-200",
      };
    case "blue":
      return {
        icon: "bg-sky-50 text-sky-700 ring-sky-100",
        value: "text-sky-700",
        panel: "hover:border-sky-200",
      };
    case "neutral":
    default:
      return {
        icon: "bg-neutral-100 text-neutral-700 ring-neutral-200",
        value: "text-neutral-950",
        panel: "hover:border-neutral-300",
      };
  }
}

function progressToneClass(tone: ProgressTone): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500";
    case "amber":
      return "bg-amber-500";
    case "red":
      return "bg-red-500";
    case "blue":
      return "bg-sky-500";
    case "neutral":
    default:
      return "bg-neutral-500";
  }
}

function presenceTone(value: string | null): string {
  switch (value) {
    case "in_camp":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "exited":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "sent_to_reception":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function exitTone(value: string | null): string {
  switch (value) {
    case "security_gate_exit":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "reception_checkout":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

function MetricCard({
  label,
  value,
  helper,
  href,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps): React.JSX.Element {
  const classes = metricToneClasses(tone);

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl ring-1",
            classes.icon,
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>

        {href ? (
          <span className="text-xs font-semibold text-neutral-400 transition group-hover:text-neutral-900">
            View
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div
          className={cn("text-3xl font-semibold tracking-tight", classes.value)}
        >
          {value}
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-900">{label}</div>
        <p className="mt-2 text-sm leading-5 text-neutral-500">{helper}</p>
      </div>
    </>
  );

  const className = cn(
    "group rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
    classes.panel,
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function LiveStatus({
  fetchedAt,
  isLive,
  isRefreshing,
  error,
  onRefresh,
  onToggleLive,
}: {
  fetchedAt: string;
  isLive: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleLive: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <span className="relative flex h-2.5 w-2.5">
        {isLive ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            isLive ? "bg-emerald-600" : "bg-neutral-400",
          )}
        />
      </span>

      <span className="text-sm font-semibold text-neutral-950">
        {isLive ? "Live" : "Paused"}
      </span>

      <span className="text-sm text-neutral-500">
        Updated {formatTime(fetchedAt)}
      </span>

      {error ? (
        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
          {error}
        </span>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
        />
        {isRefreshing ? "Refreshing" : "Refresh"}
      </button>

      <button
        type="button"
        onClick={onToggleLive}
        className="rounded-xl px-2.5 py-1 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
      >
        {isLive ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

function ProgressBar({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: ProgressTone;
}): React.JSX.Element {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          progressToneClass(tone),
        )}
        style={{ width: `${clampPercentage(value)}%` }}
      />
    </div>
  );
}

function AttentionRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ProgressTone;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-3 py-2.5">
      <span className="text-sm text-neutral-600">{label}</span>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold",
          tone === "red" && "bg-red-50 text-red-700",
          tone === "amber" && "bg-amber-50 text-amber-700",
          tone === "emerald" && "bg-emerald-50 text-emerald-700",
          tone === "blue" && "bg-sky-50 text-sky-700",
          tone === "neutral" && "bg-white text-neutral-700",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function OperationalSnapshot({
  summary,
}: {
  summary: ManagerOperationalSummary;
}): React.JSX.Element {
  const occupiedOrReserved = summary.occupiedRooms + summary.reservedRooms;
  const operationalPressure = clampPercentage(
    summary.occupancyRate + Math.round(summary.reservedRooms * 2),
  );

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
            <Activity aria-hidden="true" className="h-4 w-4" />
            Operational snapshot
          </div>

          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-neutral-950">
            {summary.availableRooms} rooms available, {occupiedOrReserved} rooms
            occupied or reserved.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Live manager view across room stock, active stays, due departures,
            and security movement.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Availability
              </div>
              <div className="mt-2 text-2xl font-semibold text-emerald-700">
                {summary.availabilityRate}%
              </div>
              <ProgressBar value={summary.availabilityRate} tone="emerald" />
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Occupancy
              </div>
              <div className="mt-2 text-2xl font-semibold text-sky-700">
                {summary.occupancyRate}%
              </div>
              <ProgressBar value={summary.occupancyRate} tone="blue" />
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Pressure
              </div>
              <div className="mt-2 text-2xl font-semibold text-amber-700">
                {operationalPressure}%
              </div>
              <ProgressBar value={operationalPressure} tone="amber" />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-950">
                Today’s attention
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Items managers should check first.
              </div>
            </div>

            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-sky-700" />
          </div>

          <div className="mt-4 space-y-3">
            <AttentionRow
              label="Due departures"
              value={summary.dueDepartures}
              tone={summary.dueDepartures > 0 ? "amber" : "emerald"}
            />
            <AttentionRow
              label="Pending checkout rooms"
              value={summary.pendingCheckoutRooms}
              tone={summary.pendingCheckoutRooms > 0 ? "amber" : "emerald"}
            />
            <AttentionRow
              label="Out of service rooms"
              value={summary.outOfServiceRooms}
              tone={summary.outOfServiceRooms > 0 ? "red" : "emerald"}
            />
            <AttentionRow
              label="Security marked exited"
              value={summary.guestsExitedSecurity}
              tone={summary.guestsExitedSecurity > 0 ? "blue" : "neutral"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-semibold text-neutral-950">{value}</div>
    </div>
  );
}

function CampPerformanceCard({
  camps,
}: {
  camps: ManagerCampSummary[];
}): React.JSX.Element {
  return (
    <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Camp occupancy
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Room availability and utilization by camp.
          </p>
        </div>

        <Building2 aria-hidden="true" className="h-5 w-5 text-neutral-400" />
      </div>

      {camps.length === 0 ? (
        <div className="p-6 text-sm text-neutral-500">
          No camp room data available.
        </div>
      ) : (
        <div className="space-y-4 p-5">
          {camps.map((camp) => (
            <div
              key={camp.campId}
              className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-neutral-950">
                    {camp.campName}
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">
                    {camp.availableRooms} available · {camp.occupiedRooms}{" "}
                    occupied · {camp.reservedRooms} reserved
                  </div>
                </div>

                <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-neutral-900 shadow-sm">
                  {camp.occupancyRate}% occupied
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={camp.occupancyRate} tone="blue" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <MiniStat label="Rooms" value={camp.totalRooms} />
                <MiniStat label="Guests" value={camp.currentGuests} />
                <MiniStat label="VIP" value={camp.vipGuests} />
                <MiniStat label="Due out" value={camp.dueDepartures} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RoomStatusCard({
  summary,
}: {
  summary: ManagerOperationalSummary;
}): React.JSX.Element {
  const rows = [
    {
      label: "Vacant ready",
      value: summary.availableRooms,
      tone: "emerald" as const,
    },
    {
      label: "Occupied",
      value: summary.occupiedRooms,
      tone: "blue" as const,
    },
    {
      label: "Reserved",
      value: summary.reservedRooms,
      tone: "amber" as const,
    },
    {
      label: "Pending check-in",
      value: summary.pendingCheckInRooms,
      tone: "neutral" as const,
    },
    {
      label: "Pending checkout",
      value: summary.pendingCheckoutRooms,
      tone: "amber" as const,
    },
    {
      label: "Out of service",
      value: summary.outOfServiceRooms,
      tone: "red" as const,
    },
    {
      label: "Manager hold",
      value: summary.managerHoldRooms,
      tone: "neutral" as const,
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          Room status mix
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Operational room state from the live room summary view.
        </p>
      </div>

      <div className="space-y-3 p-5">
        {rows.map((row) => {
          const percentage =
            summary.totalRooms > 0
              ? Math.round((row.value / summary.totalRooms) * 100)
              : 0;

          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-700">
                  {row.label}
                </span>
                <span className="font-semibold text-neutral-950">
                  {row.value}
                </span>
              </div>
              <ProgressBar value={percentage} tone={row.tone} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CurrentGuestsTable({
  guests,
}: {
  guests: ManagerCurrentGuestRow[];
}): React.JSX.Element {
  return (
    <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Guests currently checked in
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Assigned room, stay status, security presence, and expected
            departure.
          </p>
        </div>

        <Link
          href={APP_ROUTES.manager.guests.current}
          className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          View all
        </Link>
      </div>

      {guests.length === 0 ? (
        <div className="p-8 text-sm text-neutral-500">
          No guests are currently checked in.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Guest</th>
                <th className="px-5 py-3 font-semibold">Camp</th>
                <th className="px-5 py-3 font-semibold">Room</th>
                <th className="px-5 py-3 font-semibold">Presence</th>
                <th className="px-5 py-3 font-semibold">Expected departure</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {guests.map((guest) => (
                <tr
                  key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}
                  className="transition hover:bg-neutral-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-neutral-950">
                        {guest.guest_name ?? "Unnamed guest"}
                      </div>

                      {guest.is_vip ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          VIP
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-neutral-500">
                      {[guest.organization, guest.guest_category]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {guest.camp_name ?? "—"}
                  </td>

                  <td className="px-5 py-4 font-semibold text-neutral-900">
                    {guest.room_number ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        presenceTone(guest.security_presence_status),
                      )}
                    >
                      {formatLabel(guest.security_presence_status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {formatDateTime(guest.expected_departure_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExitedGuestsTable({
  guests,
}: {
  guests: ManagerExitedGuestRow[];
}): React.JSX.Element {
  return (
    <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Recent exits
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Reception checkouts and security gate exits.
          </p>
        </div>

        <Link
          href={APP_ROUTES.manager.guests.exited}
          className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          View all
        </Link>
      </div>

      {guests.length === 0 ? (
        <div className="p-8 text-sm text-neutral-500">
          No recent exits found.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {guests.slice(0, 6).map((guest) => (
            <div
              key={[guest.stay_id, guest.guest_id, guest.departure_or_exit_time]
                .filter(Boolean)
                .join("-")}
              className="flex items-start justify-between gap-4 p-5 transition hover:bg-neutral-50/70"
            >
              <div>
                <div className="font-semibold text-neutral-950">
                  {guest.guest_name ?? "Unnamed guest"}
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  Room {guest.room_number ?? "—"} ·{" "}
                  {formatDateTime(guest.departure_or_exit_time)}
                </div>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  exitTone(guest.exit_source),
                )}
              >
                {formatLabel(guest.exit_source)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActions(): React.JSX.Element {
  const actions = [
    {
      label: "Open room board",
      href: APP_ROUTES.manager.rooms.board,
      icon: BedDouble,
    },
    {
      label: "Available rooms",
      href: APP_ROUTES.manager.rooms.available,
      icon: DoorOpen,
    },
    {
      label: "Occupied rooms",
      href: APP_ROUTES.manager.rooms.occupied,
      icon: UserCheck,
    },
    {
      label: "Current guests",
      href: APP_ROUTES.manager.guests.current,
      icon: Users,
    },
  ] as const;

  return (
    <section className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-950">Quick actions</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Fast manager navigation for daily operations.
      </p>

      <div className="mt-5 grid gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:border-sky-200 hover:bg-sky-50"
          >
            <span className="inline-flex items-center gap-2">
              <action.icon aria-hidden="true" className="h-4 w-4" />
              {action.label}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LiveCampManagerDashboard({
  initialData,
}: {
  initialData: ManagerDashboardData;
}): React.JSX.Element {
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<LiveState>({
    data: initialData,
    isRefreshing: false,
    isLive: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setState((current) => ({
      ...current,
      isRefreshing: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/manager/dashboard", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json()) as
        | ManagerDashboardData
        | DashboardApiError;

      if (!response.ok || isDashboardApiError(payload)) {
        throw new Error(
          isDashboardApiError(payload) && payload.error
            ? payload.error
            : "Live refresh failed.",
        );
      }

      setState((current) => ({
        ...current,
        data: payload,
        isRefreshing: false,
        error: null,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setState((current) => ({
        ...current,
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Refresh failed",
      }));
    }
  }, []);

  useEffect(() => {
    if (!state.isLive) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [refresh, state.isLive]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const summaryCards = useMemo<MetricCardProps[]>(
    () => [
      {
        label: "Available rooms",
        value: state.data.summary.availableRooms,
        helper: `${state.data.summary.availabilityRate}% of visible rooms ready.`,
        href: APP_ROUTES.manager.rooms.available,
        icon: DoorOpen,
        tone: "emerald",
      },
      {
        label: "Occupied rooms",
        value: state.data.summary.occupiedRooms,
        helper: `${state.data.summary.occupancyRate}% current occupancy.`,
        href: APP_ROUTES.manager.rooms.occupied,
        icon: BedDouble,
        tone: "blue",
      },
      {
        label: "Reserved rooms",
        value: state.data.summary.reservedRooms,
        helper: "Rooms reserved for expected arrivals.",
        href: APP_ROUTES.manager.rooms.board,
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Current guests",
        value: state.data.summary.currentGuests,
        helper: `${state.data.summary.guestsInsideCamp} confirmed inside camp.`,
        href: APP_ROUTES.manager.guests.current,
        icon: Users,
        tone: "neutral",
      },
      {
        label: "Due departures",
        value: state.data.summary.dueDepartures,
        helper: "Checked-in guests past expected departure time.",
        href: APP_ROUTES.manager.guests.current,
        icon: AlertTriangle,
        tone: state.data.summary.dueDepartures > 0 ? "amber" : "emerald",
      },
      {
        label: "Recent exits",
        value: state.data.summary.recentlyExitedGuests,
        helper: "Reception checkouts and security exits.",
        href: APP_ROUTES.manager.guests.exited,
        icon: CheckCircle2,
        tone: "blue",
      },
    ],
    [state.data.summary],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LiveStatus
          fetchedAt={state.data.fetchedAt}
          isLive={state.isLive}
          isRefreshing={state.isRefreshing}
          error={state.error}
          onRefresh={() => void refresh()}
          onToggleLive={() =>
            setState((current) => ({
              ...current,
              isLive: !current.isLive,
            }))
          }
        />
      </div>

      <OperationalSnapshot summary={state.data.summary} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <CampPerformanceCard camps={state.data.camps} />
          <CurrentGuestsTable guests={state.data.currentGuests} />
        </div>

        <div className="space-y-6">
          <RoomStatusCard summary={state.data.summary} />
          <ExitedGuestsTable guests={state.data.exitedGuests} />
          <QuickActions />
        </div>
      </section>
    </div>
  );
}
