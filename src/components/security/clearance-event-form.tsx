import {
  clearanceStatusOptions,
  riskLevelOptions,
  type ClearanceStatus,
} from "@/lib/validation/security";
import { createSecurityClearanceEventAction } from "@/lib/actions/security/create-clearance-event";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type ClearanceEventFormLayout = "default" | "inspector";

type ClearanceEventFormProps = {
  guestId: string;
  currentStatus: string | null;
  submitLabel?: string;
  layout?: ClearanceEventFormLayout;
};

const CLEARANCE_STATUSES = new Set<string>([
  "pending",
  "cleared",
  "watchlist",
  "denied",
  "suspended",
]);

function normalizeCurrentStatus(status: string | null): ClearanceStatus {
  if (status && CLEARANCE_STATUSES.has(status)) {
    return status as ClearanceStatus;
  }

  return "pending";
}

export function ClearanceEventForm({
  guestId,
  currentStatus,
  submitLabel = "Save clearance event",
  layout = "default",
}: ClearanceEventFormProps): React.JSX.Element {
  const defaultStatus = normalizeCurrentStatus(currentStatus);
  const isInspector = layout === "inspector";

  return (
    <form action={createSecurityClearanceEventAction}>
      <input type="hidden" name="guestId" value={guestId} />

      <Card variant={isInspector ? "console" : "card"} className="min-w-0">
        <CardHeader
          className={
            isInspector ? "border-b border-border px-4 py-3" : undefined
          }
        >
          <CardTitle className={isInspector ? "text-sm" : undefined}>
            Clearance decision
          </CardTitle>

          <CardDescription
            className={isInspector ? "mt-1 text-xs leading-5" : undefined}
          >
            Record the latest security decision for this guest. Restricted and
            high-risk decisions require notes.
          </CardDescription>
        </CardHeader>

        <CardContent className={isInspector ? "space-y-4 p-4" : "space-y-5"}>
          <div
            className={isInspector ? "grid gap-3" : "grid gap-4 md:grid-cols-2"}
          >
            <Select
              label="Clearance status"
              id="clearance-new-status"
              required
              name="newStatus"
              defaultValue={defaultStatus}
              options={clearanceStatusOptions}
            />

            <Select
              label="Risk level"
              id="clearance-risk-level"
              required
              name="riskLevel"
              defaultValue="normal"
              options={riskLevelOptions}
            />
          </div>

          <Input
            label="Expires at"
            hint="Optional. Use this for temporary clearance, temporary suspension, or time-limited access."
            id="clearance-expires-at"
            name="expiresAt"
            type="datetime-local"
          />

          <Textarea
            label="Security notes"
            hint="Keep notes factual, concise, and useful for future reviews."
            id="clearance-notes"
            name="notes"
            rows={isInspector ? 3 : 4}
            maxLength={1000}
            placeholder="Required for watchlist, denied, suspended, high-risk, or critical-risk decisions."
            className={isInspector ? "min-h-24 resize-y" : "resize-y"}
          />

          <PendingSubmitButton
            pendingLabel="Saving clearance event..."
            fullWidth
          >
            {submitLabel}
          </PendingSubmitButton>
        </CardContent>
      </Card>
    </form>
  );
}
