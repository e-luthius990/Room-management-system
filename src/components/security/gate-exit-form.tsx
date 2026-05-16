import { markSecurityGateExitAction } from "@/lib/actions/security/create-clearance-event";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type GateExitFormProps = {
  securityEventId: string;
  guestName: string;
  entryAt?: string | null;
  compact?: boolean;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

export function GateExitForm({
  securityEventId,
  guestName,
  entryAt,
  compact = false,
}: GateExitFormProps): React.JSX.Element {
  return (
    <form action={markSecurityGateExitAction} className="space-y-3">
      <input type="hidden" name="securityEventId" value={securityEventId} />

      {!compact ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Confirm gate exit
          </h3>

          <p className="mt-1 text-sm leading-6 text-muted">
            Mark {guestName} as physically left. Entry recorded at{" "}
            {formatDateTime(entryAt)}.
          </p>
        </div>
      ) : null}

      <Textarea
        id={`exit-notes-${securityEventId}`}
        name="exitNotes"
        label="Exit notes"
        rows={compact ? 2 : 3}
        maxLength={1000}
        placeholder="Optional. Example: Left with company transport, visitor badge returned..."
        className="resize-y"
      />

      <Button
        type="submit"
        size={compact ? "sm" : "md"}
        className={compact ? undefined : "w-full"}
      >
        Mark as left
      </Button>
    </form>
  );
}
