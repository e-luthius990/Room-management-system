import {
  clearanceStatusOptions,
  riskLevelOptions,
  securityVisitTypeOptions,
} from "@/lib/validation/security";
import { recordSecurityGateEntryAction } from "@/lib/actions/security/create-clearance-event";
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

type GateEntryFormProps = {
  guestId: string;
  campId: string;
  guestName: string;
  campName?: string | null;
  currentClearanceStatus?: string | null;
};

function normalizeClearanceStatus(status: string | null | undefined): string {
  if (
    status === "pending" ||
    status === "cleared" ||
    status === "watchlist" ||
    status === "denied" ||
    status === "suspended"
  ) {
    return status;
  }

  return "cleared";
}

export function GateEntryForm({
  guestId,
  campId,
  guestName,
  campName,
  currentClearanceStatus,
}: GateEntryFormProps): React.JSX.Element {
  const defaultStatus = normalizeClearanceStatus(currentClearanceStatus);

  return (
    <form action={recordSecurityGateEntryAction}>
      <input type="hidden" name="guestId" value={guestId} />
      <input type="hidden" name="campId" value={campId} />

      <Card variant="card">
        <CardHeader>
          <div className="page-kicker">Gate entry</div>

          <CardTitle>Record arrival for {guestName}</CardTitle>

          <CardDescription>
            This records that the person physically entered{" "}
            {campName?.trim() ? campName : "the selected camp"}. Reception room
            allocation remains separate.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Visit type"
              id="gate-visit-type"
              name="visitType"
              required
              defaultValue="day_visitor"
              options={securityVisitTypeOptions}
            />

            <Select
              label="Clearance status"
              id="gate-clearance-status"
              name="clearanceStatus"
              required
              defaultValue={defaultStatus}
              options={clearanceStatusOptions}
            />

            <Select
              label="Risk level"
              id="gate-risk-level"
              name="riskLevel"
              required
              defaultValue="normal"
              options={riskLevelOptions}
            />

            <Input
              label="Host name"
              id="gate-host-name"
              name="hostName"
              type="text"
              maxLength={150}
              placeholder="Person being visited"
            />
          </div>

          <Input
            label="Host department"
            hint="Host name or department is required for day visitors, contractors, staff visits, and deliveries."
            id="gate-host-department"
            name="hostDepartment"
            type="text"
            maxLength={150}
            placeholder="Department, project, or unit"
          />

          <Textarea
            label="Purpose of visit"
            id="gate-purpose"
            name="purpose"
            required
            rows={3}
            maxLength={300}
            placeholder="Example: Meeting procurement team, overnight delegate stay, delivery to stores..."
            className="resize-y"
          />

          <Textarea
            label="Security notes"
            id="gate-notes"
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Required for restricted statuses or high-risk entries."
            className="resize-y"
          />

          <PendingSubmitButton pendingLabel="Recording gate entry..." fullWidth>
            Record gate entry
          </PendingSubmitButton>
        </CardContent>
      </Card>
    </form>
  );
}
