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
    label: "Total rooms",
    note: "All rooms in scope",
    tone: "default",
    icon: <BedDouble className="size-4" aria-hidden="true" />,
    value: (summary) => summary.total,
  },
  {
    key: "vacantReady",
    label: "Vacant ready",
    note: "Ready for allocation",
    tone: "success",
    icon: <DoorOpen className="size-4" aria-hidden="true" />,
    value: (summary) => summary.vacantReady,
  },
  {
    key: "reserved",
    label: "Reserved",
    note: "Held for arrival",
    tone: "warning",
    icon: <CalendarClock className="size-4" aria-hidden="true" />,
    value: (summary) => summary.reserved,
  },
  {
    key: "pendingCheckIn",
    label: "Pending check-in",
    note: "Expected arrivals",
    tone: "warning",
    icon: <CalendarClock className="size-4" aria-hidden="true" />,
    value: (summary) => summary.pendingCheckIn,
  },
  {
    key: "occupied",
    label: "Occupied",
    note: "Active stays",
    tone: "info",
    icon: <UserRound className="size-4" aria-hidden="true" />,
    value: (summary) => summary.occupied,
  },
  {
    key: "pendingCheckout",
    label: "Pending checkout",
    note: "Guests leaving soon",
    tone: "warning",
    icon: <UserRound className="size-4" aria-hidden="true" />,
    value: (summary) => summary.pendingCheckout,
  },
  {
    key: "blocked",
    label: "Blocked",
    note: "Not assignable",
    tone: "danger",
    icon: <Lock className="size-4" aria-hidden="true" />,
    value: (summary) => summary.blocked,
  },
] as const satisfies readonly SummaryItem[];

export function RoomBoardSummaryCards({
  summary,
}: RoomBoardSummaryProps): JSX.Element {
  return (
    <section className="ops-live-strip" aria-label="Room availability summary">
      {summaryItems.map((item) => (
        <article
          key={item.key}
          className={cn("ops-live-card", toneClass[item.tone])}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="ops-live-label">{item.label}</p>
              <p className="ops-live-value">{item.value(summary)}</p>
              <p className="ops-live-note">{item.note}</p>
            </div>

            <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-muted shadow-xs">
              {item.icon}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
