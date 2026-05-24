// src/components/room-board/room-board-summary-cards.tsx

import type { JSX } from "react";
import {
  BedDouble,
  CalendarClock,
  DoorOpen,
  Lock,
  UserRound,
} from "lucide-react";
import type { RoomBoardSummary } from "@/lib/queries/room-board/get-room-board";
import { cn } from "@/lib/utils/cn";

type RoomBoardSummaryProps = {
  summary: RoomBoardSummary;
};

type SummaryTone = "default" | "success" | "warning" | "info" | "danger";

type SummaryItem = {
  key: string;
  label: string;
  note: string;
  tone: SummaryTone;
  icon: JSX.Element;
  value: (summary: RoomBoardSummary) => number;
};

const toneClass: Record<SummaryTone, string> = {
  default: "",
  success: "ops-live-card-success",
  warning: "ops-live-card-warning",
  info: "ops-live-card-info",
  danger: "ops-live-card-danger",
};

const summaryItems = [
  {
    key: "total",
    label: "Total",
    note: "Rooms in scope",
    tone: "default",
    icon: <BedDouble className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.total,
  },
  {
    key: "vacantReady",
    label: "Vacant",
    note: "Ready now",
    tone: "success",
    icon: <DoorOpen className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.vacantReady,
  },
  {
    key: "reserved",
    label: "Reserved",
    note: "Held",
    tone: "warning",
    icon: <CalendarClock className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.reserved,
  },
  {
    key: "pendingCheckIn",
    label: "Check-in",
    note: "Pending",
    tone: "warning",
    icon: <CalendarClock className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.pendingCheckIn,
  },
  {
    key: "occupied",
    label: "Occupied",
    note: "Active stays",
    tone: "info",
    icon: <UserRound className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.occupied,
  },
  {
    key: "pendingCheckout",
    label: "Checkout",
    note: "Leaving soon",
    tone: "warning",
    icon: <UserRound className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.pendingCheckout,
  },
  {
    key: "blocked",
    label: "Blocked",
    note: "Not assignable",
    tone: "danger",
    icon: <Lock className="size-3.5" aria-hidden="true" />,
    value: (summary) => summary.blocked,
  },
] as const satisfies readonly SummaryItem[];

export function RoomBoardSummaryCards({
  summary,
}: RoomBoardSummaryProps): JSX.Element {
  return (
    <section
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"
      aria-label="Room availability summary"
    >
      {summaryItems.map((item) => (
        <article
          key={item.key}
          className={cn(
            "ops-live-card min-h-[4.35rem] px-3 py-2.5",
            toneClass[item.tone],
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase leading-3 tracking-[0.13em] text-muted">
                {item.label}
              </p>

              <p className="mt-0.5 text-xl font-semibold leading-6 tracking-[-0.045em] text-foreground">
                {item.value(summary)}
              </p>

              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted">
                {item.note}
              </p>
            </div>

            <div className="flex size-7 shrink-0 items-center justify-center border border-border bg-surface-2 text-muted shadow-xs">
              {item.icon}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
