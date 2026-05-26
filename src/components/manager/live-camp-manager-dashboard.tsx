"use client";

import Link from "next/link";
import {
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
  type JSX,
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

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Africa/Kampala",
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
  rail: string;
} {
  switch (tone) {
    case "emerald":
      return {
        icon: "bg-emerald-50 text-emerald-700",
        value: "text-emerald-700",
        rail: "border-l-emerald-500",
      };
    case "amber":
      return {
        icon: "bg-amber-50 text-amber-700",
        value: "text-amber-700",
        rail: "border-l-amber-500",
      };
    case "red":
      return {
        icon: "bg-red-50 text-red-700",
        value: "text-red-700",
        rail: "border-l-red-500",
      };
    case "blue":
      return {
        icon: "bg-sky-50 text-sky-700",
        value: "text-sky-700",
        rail: "border-l-sky-500",
      };
    case "neutral":
    default:
      return {
        icon: "bg-neutral-100 text-neutral-700",
        value: "text-foreground",
        rail: "border-l-border",
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

function StatusChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  href,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps): JSX.Element {
  const classes = metricToneClasses(tone);

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="metadata-label">{label}</p>
          <div
            className={cn(
              "mt-1 text-2xl font-semibold tracking-[-0.04em]",
              classes.value,
            )}
          >
            {value}
          </div>
        </div>

        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center border border-border",
            classes.icon,
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{helper}</p>

      {href ? (
        <span className="mt-3 inline-flex text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition group-hover:text-foreground">
          Open
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "group block min-h-[8.75rem] border border-border border-l-2 bg-surface p-3 shadow-sm transition hover:bg-background",
    classes.rail,
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
}): JSX.Element {
  return (
    <section className="ops-command justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 border border-border",
            isLive ? "bg-emerald-600" : "bg-neutral-400",
          )}
        />

        <span className="text-sm font-semibold text-foreground">
          {isLive ? "Live manager feed" : "Manager feed paused"}
        </span>

        <span className="text-sm text-muted">
          Updated {formatTime(fetchedAt)}
        </span>

        {error ? (
          <StatusChip className="border-red-200 bg-red-50 text-red-700">
            {error}
          </StatusChip>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
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
          className="border border-transparent px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-border hover:bg-surface hover:text-foreground"
        >
          {isLive ? "Pause" : "Resume"}
        </button>
      </div>
    </section>
  );
}

function ProgressBar({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: ProgressTone;
}): JSX.Element {
  return (
    <div className="h-1.5 overflow-hidden bg-neutral-100">
      <div
        className={cn(
          "h-full transition-all duration-500",
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
}): JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cn(
          "min-w-8 border px-2 py-1 text-center text-xs font-semibold",
          tone === "red" && "border-red-200 bg-red-50 text-red-700",
          tone === "amber" && "border-amber-200 bg-amber-50 text-amber-700",
          tone === "emerald" &&
            "border-emerald-200 bg-emerald-50 text-emerald-700",
          tone === "blue" && "border-sky-200 bg-sky-50 text-sky-700",
          tone === "neutral" && "border-border bg-background text-foreground",
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
}): JSX.Element {
  const occupiedOrReserved = summary.occupiedRooms + summary.reservedRooms;
  const operationalPressure = clampPercentage(
    summary.occupancyRate + Math.round(summary.reservedRooms * 2),
  );

  return (
    <section className="surface-panel overflow-hidden">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3 xl:border-b-0 xl:border-r">
          <div className="border border-border bg-surface p-3">
            <p className="metadata-label">Availability</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold tracking-[-0.04em] text-emerald-700">
                {summary.availabilityRate}%
              </span>
              <span className="text-xs text-muted">
                {summary.availableRooms} ready
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={summary.availabilityRate} tone="emerald" />
            </div>
          </div>

          <div className="border border-border bg-surface p-3">
            <p className="metadata-label">Occupancy</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold tracking-[-0.04em] text-sky-700">
                {summary.occupancyRate}%
              </span>
              <span className="text-xs text-muted">
                {occupiedOrReserved} held
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={summary.occupancyRate} tone="blue" />
            </div>
          </div>

          <div className="border border-border bg-surface p-3">
            <p className="metadata-label">Pressure</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold tracking-[-0.04em] text-amber-700">
                {operationalPressure}%
              </span>
              <span className="text-xs text-muted">
                {summary.pendingCheckoutRooms} checkout
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={operationalPressure} tone="amber" />
            </div>
          </div>
        </div>

        <div className="bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metadata-label">Today’s attention</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Check these first
              </p>
            </div>

            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-muted" />
          </div>

          <div className="mt-3">
            <AttentionRow
              label="Due departures"
              value={summary.dueDepartures}
              tone={summary.dueDepartures > 0 ? "amber" : "emerald"}
            />
            <AttentionRow
              label="Pending checkout"
              value={summary.pendingCheckoutRooms}
              tone={summary.pendingCheckoutRooms > 0 ? "amber" : "emerald"}
            />
            <AttentionRow
              label="Out of service"
              value={summary.outOfServiceRooms}
              tone={summary.outOfServiceRooms > 0 ? "red" : "emerald"}
            />
            <AttentionRow
              label="Security exited"
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
}): JSX.Element {
  return (
    <div className="metadata-item">
      <div className="metadata-label">{label}</div>
      <div className="metadata-value mt-1">{value}</div>
    </div>
  );
}

function CampPerformanceCard({
  camps,
}: {
  camps: ManagerCampSummary[];
}): JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="min-w-0">
          <p className="page-kicker">Camp pressure</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Camp occupancy
          </h2>
          <p className="mt-1 text-sm text-muted">
            Availability and utilization by camp.
          </p>
        </div>

        <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
      </div>

      {camps.length === 0 ? (
        <div className="p-5 text-sm text-muted">
          No camp room data available.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {camps.map((camp) => (
            <div key={camp.campId} className="p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    {camp.campName}
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    {camp.availableRooms} available · {camp.occupiedRooms}{" "}
                    occupied · {camp.reservedRooms} reserved
                  </div>
                </div>

                <div className="border border-border bg-surface px-3 py-2 text-right">
                  <div className="text-lg font-semibold tracking-[-0.04em] text-foreground">
                    {camp.occupancyRate}%
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Occupied
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar value={camp.occupancyRate} tone="blue" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
}): JSX.Element {
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
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <p className="page-kicker">Rooms</p>
        <h2 className="mt-1 text-base font-semibold text-foreground">
          Status mix
        </h2>
      </div>

      <div className="space-y-3 p-4">
        {rows.map((row) => {
          const percentage =
            summary.totalRooms > 0
              ? Math.round((row.value / summary.totalRooms) * 100)
              : 0;

          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-muted">{row.label}</span>
                <span className="font-semibold text-foreground">
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
}): JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="min-w-0">
          <p className="page-kicker">Current stays</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Guests currently checked in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Room, guest, security presence, and expected departure.
          </p>
        </div>

        <Link
          href={APP_ROUTES.manager.guests.current}
          className="shrink-0 border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background"
        >
          Open register
        </Link>
      </div>

      {guests.length === 0 ? (
        <div className="p-5 text-sm text-muted">
          No guests are currently checked in.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {guests.map((guest) => (
            <div
              key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}
              className="grid gap-3 p-4 transition hover:bg-surface sm:grid-cols-[7rem_minmax(0,1fr)_12rem_13rem] sm:items-center"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Room
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground">
                  {guest.room_number ?? "—"}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate font-semibold text-foreground">
                    {guest.guest_name ?? "Unnamed guest"}
                  </div>

                  {guest.is_vip ? (
                    <StatusChip className="border-amber-200 bg-amber-50 text-amber-700">
                      VIP
                    </StatusChip>
                  ) : null}
                </div>

                <div className="mt-1 truncate text-sm text-muted">
                  {[guest.organization, guest.guest_category]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>

                <div className="mt-1 text-xs text-muted">
                  {guest.camp_name ?? "—"}
                </div>
              </div>

              <div>
                <StatusChip
                  className={presenceTone(guest.security_presence_status)}
                >
                  {formatLabel(guest.security_presence_status)}
                </StatusChip>
              </div>

              <div className="text-sm text-muted">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Expected departure
                </span>
                <span className="mt-1 block text-foreground">
                  {formatDateTime(guest.expected_departure_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExitedGuestsTable({
  guests,
}: {
  guests: ManagerExitedGuestRow[];
}): JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="min-w-0">
          <p className="page-kicker">Movement</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Recent exits
          </h2>
          <p className="mt-1 text-sm text-muted">
            Reception checkouts and security gate exits.
          </p>
        </div>

        <Link
          href={APP_ROUTES.manager.guests.exited}
          className="shrink-0 border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background"
        >
          Open
        </Link>
      </div>

      {guests.length === 0 ? (
        <div className="p-5 text-sm text-muted">No recent exits found.</div>
      ) : (
        <div className="divide-y divide-border">
          {guests.slice(0, 6).map((guest) => (
            <div
              key={[guest.stay_id, guest.guest_id, guest.departure_or_exit_time]
                .filter(Boolean)
                .join("-")}
              className="grid gap-3 p-4 transition hover:bg-surface sm:grid-cols-[5.5rem_minmax(0,1fr)]"
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Room
                </div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">
                  {guest.room_number ?? "—"}
                </div>
              </div>

              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">
                  {guest.guest_name ?? "Unnamed guest"}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {formatDateTime(guest.departure_or_exit_time)}
                </div>
                <div className="mt-2">
                  <StatusChip className={exitTone(guest.exit_source)}>
                    {formatLabel(guest.exit_source)}
                  </StatusChip>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActions(): JSX.Element {
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
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <p className="page-kicker">Manager controls</p>
        <h2 className="mt-1 text-base font-semibold text-foreground">
          Quick actions
        </h2>
      </div>

      <div className="grid gap-2 p-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            <action.icon aria-hidden="true" className="h-4 w-4 text-muted" />
            <span className="truncate">{action.label}</span>
            <span aria-hidden="true" className="text-muted">
              →
            </span>
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
}): JSX.Element {
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
    <div className="grid gap-4">
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

      <OperationalSnapshot summary={state.data.summary} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <CampPerformanceCard camps={state.data.camps} />
          <CurrentGuestsTable guests={state.data.currentGuests} />
        </div>

        <aside className="grid min-w-0 content-start gap-4">
          <RoomStatusCard summary={state.data.summary} />
          <ExitedGuestsTable guests={state.data.exitedGuests} />
          <QuickActions />
        </aside>
      </section>
    </div>
  );
}
