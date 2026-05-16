import type { RoomBoardSummary } from "@/lib/queries/room-board/get-room-board";

type RoomBoardSummaryProps = {
  summary: RoomBoardSummary;
};

type SummaryTone = "default" | "success" | "warning" | "muted";

type SummaryItem = {
  key: string;
  label: string;
  note: string;
  tone: SummaryTone;
  value: (summary: RoomBoardSummary) => number;
};

function getUnavailableCount(summary: RoomBoardSummary): number {
  return (
    summary.outOfService +
    summary.managerHold +
    summary.underMaintenance +
    summary.maintenanceBlocked +
    summary.needsCleaning +
    summary.cleaningInProgress +
    summary.inspectionNeeded
  );
}

const summaryItems: SummaryItem[] = [
  {
    key: "total",
    label: "Total rooms",
    note: "All rooms in scope",
    tone: "default",
    value: (summary) => summary.total,
  },
  {
    key: "vacantReady",
    label: "Vacant ready",
    note: "Ready for allocation",
    tone: "success",
    value: (summary) => summary.vacantReady,
  },
  {
    key: "reserved",
    label: "Reserved",
    note: "Confirmed reservations",
    tone: "default",
    value: (summary) => summary.reserved,
  },
  {
    key: "pendingCheckIn",
    label: "Pending check-in",
    note: "Expected arrivals",
    tone: "warning",
    value: (summary) => summary.pendingCheckIn,
  },
  {
    key: "occupied",
    label: "Occupied",
    note: "Active stays",
    tone: "default",
    value: (summary) => summary.occupied,
  },
  {
    key: "pendingCheckout",
    label: "Pending checkout",
    note: "Guests leaving soon",
    tone: "warning",
    value: (summary) => summary.pendingCheckout,
  },
  {
    key: "unavailable",
    label: "Unavailable",
    note: "Not assignable",
    tone: "muted",
    value: getUnavailableCount,
  },
];

function getToneDotClass(tone: SummaryTone): string {
  switch (tone) {
    case "success":
      return "bg-success-600";

    case "warning":
      return "bg-warning-700";

    case "muted":
      return "bg-border-strong";

    default:
      return "bg-info-600";
  }
}

export function RoomBoardSummaryCards({
  summary,
}: RoomBoardSummaryProps): React.JSX.Element {
  return (
    <section
      className="availability-strip"
      aria-label="Room availability summary"
    >
      {summaryItems.map((item) => (
        <article key={item.key} className="availability-cell">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="availability-label">{item.label}</p>
              <p className="availability-value">{item.value(summary)}</p>
              <p className="availability-note">{item.note}</p>
            </div>

            <span
              aria-hidden="true"
              className={`mt-1 size-2.5 shrink-0 rounded-full ${getToneDotClass(
                item.tone,
              )}`}
            />
          </div>
        </article>
      ))}
    </section>
  );
}
