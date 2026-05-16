"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_ROUTES } from "@/lib/auth/routes";
import type {
  ManagerCurrentGuestRow,
  ManagerDashboardData,
  ManagerExitedGuestRow,
} from "@/lib/queries/manager/get-manager-dashboard";

type LiveState = {
  data: ManagerDashboardData;
  isRefreshing: boolean;
  isLive: boolean;
  error: string | null;
};

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

function presenceTone(value: string | null): string {
  switch (value) {
    case "in_camp":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "exited":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "sent_to_reception":
      return "border-blue-200 bg-blue-50 text-blue-800";
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
}: {
  label: string;
  value: number;
  helper: string;
  href: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
    >
      <div className="text-sm font-medium text-neutral-500">{label}</div>

      <div className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        {value}
      </div>

      <p className="mt-3 text-sm text-neutral-500">{helper}</p>

      <div className="mt-4 text-sm font-semibold text-neutral-950 transition group-hover:translate-x-1">
        View →
      </div>
    </Link>
  );
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
          className={[
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            isLive ? "bg-emerald-600" : "bg-neutral-400",
          ].join(" ")}
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
        className="rounded-xl border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRefreshing ? "Refreshing…" : "Refresh"}
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

function CurrentGuestsTable({
  guests,
}: {
  guests: ManagerCurrentGuestRow[];
}): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Guests currently checked in
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Assigned room, stay status, security presence, and arrival time.
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
                <th className="px-5 py-3 font-semibold">Assigned room</th>
                <th className="px-5 py-3 font-semibold">Stay status</th>
                <th className="px-5 py-3 font-semibold">Security presence</th>
                <th className="px-5 py-3 font-semibold">Arrival time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {guests.map((guest) => (
                <tr key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-neutral-950">
                      {guest.guest_name ?? "Unnamed guest"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {[guest.organization, guest.guest_category]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </td>

                  <td className="px-5 py-4 font-medium text-neutral-900">
                    {guest.room_number ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {formatLabel(guest.stay_status)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        presenceTone(guest.security_presence_status),
                      ].join(" ")}
                    >
                      {formatLabel(guest.security_presence_status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {formatDateTime(guest.arrival_time)}
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
    <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Exited guests
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Checked out by reception or marked as left by security.
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
          No exited guests found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Guest</th>
                <th className="px-5 py-3 font-semibold">Previous room</th>
                <th className="px-5 py-3 font-semibold">Exit source</th>
                <th className="px-5 py-3 font-semibold">
                  Departure / exit time
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {guests.map((guest) => (
                <tr
                  key={[
                    guest.stay_id,
                    guest.guest_id,
                    guest.departure_or_exit_time,
                  ]
                    .filter(Boolean)
                    .join("-")}
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-neutral-950">
                      {guest.guest_name ?? "Unnamed guest"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {[guest.organization, guest.guest_category]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </td>

                  <td className="px-5 py-4 font-medium text-neutral-900">
                    {guest.room_number ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        exitTone(guest.exit_source),
                      ].join(" ")}
                    >
                      {formatLabel(guest.exit_source)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {formatDateTime(guest.departure_or_exit_time)}
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
      });

      if (!response.ok) {
        throw new Error("Live refresh failed.");
      }

      const data = (await response.json()) as ManagerDashboardData;

      setState((current) => ({
        ...current,
        data,
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
        error: "Refresh failed",
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
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refresh, state.isLive]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const guestCards = useMemo(
    () => [
      {
        label: "Currently checked in",
        value: state.data.currentGuests.length,
        helper: "Active stays with assigned rooms.",
        href: APP_ROUTES.manager.guests.current,
      },
      {
        label: "Recently exited",
        value: state.data.exitedGuests.length,
        helper: "Checked out or marked left by security.",
        href: APP_ROUTES.manager.guests.exited,
      },
    ],
    [state.data.currentGuests.length, state.data.exitedGuests.length],
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

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Available / vacant rooms"
          value={state.data.rooms.available}
          href={APP_ROUTES.manager.rooms.available}
          helper="Rooms with vacant_ready status."
        />

        <MetricCard
          label="Occupied rooms"
          value={state.data.rooms.occupied}
          href={APP_ROUTES.manager.rooms.occupied}
          helper="Rooms currently occupied."
        />

        <MetricCard
          label="Total visible rooms"
          value={state.data.rooms.total}
          href={APP_ROUTES.manager.rooms.board}
          helper="Full room board with filters."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {guestCards.map((card) => (
          <MetricCard
            key={card.href}
            label={card.label}
            value={card.value}
            helper={card.helper}
            href={card.href}
          />
        ))}
      </section>

      <CurrentGuestsTable guests={state.data.currentGuests} />

      <ExitedGuestsTable guests={state.data.exitedGuests} />
    </div>
  );
}
