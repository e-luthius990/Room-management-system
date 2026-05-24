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

function normalizeGateEntryClearanceStatus(
  status: string | null | undefined,
): string {
  if (status === "cleared") {
    return "cleared";
  }

  if (status === "watchlist" || status === "denied" || status === "suspended") {
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
  const defaultStatus = normalizeGateEntryClearanceStatus(
    currentClearanceStatus,
  );

  return (
    <form action={recordSecurityGateEntryAction}>
      <input type="hidden" name="guestId" value={guestId} />
      <input type="hidden" name="campId" value={campId} />

      <Card variant="console" className="min-w-0 overflow-hidden">
        <CardHeader className="border-b border-border px-4 py-3">
          <div className="page-kicker">Gate entry</div>

          <CardTitle className="text-sm">
            Record arrival for {guestName}
          </CardTitle>

          <CardDescription className="mt-1 text-xs leading-5">
            Confirm physical entry into{" "}
            {campName?.trim() ? campName : "the selected camp"} and record the
            security decision in one operation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-4">
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="min-w-0">
              <div className="mb-3 border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Gate movement
                </h3>

                <p className="mt-1 text-xs leading-5 text-muted">
                  Record the visit type, host, and reason for entry.
                </p>
              </div>

              <div className="grid gap-4">
                <Select
                  label="Visit type"
                  id="gate-visit-type"
                  name="visitType"
                  required
                  defaultValue="day_visitor"
                  options={securityVisitTypeOptions}
                />

                <Input
                  label="Host name"
                  id="gate-host-name"
                  name="hostName"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="Person being visited"
                />

                <Input
                  label="Host department"
                  hint="Use department, project, or unit when the exact host is not enough."
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
                  rows={4}
                  maxLength={300}
                  placeholder="Example: Meeting procurement team, delivery to stores, overnight delegate stay..."
                  className="min-h-28 resize-y"
                />
              </div>
            </section>

            <section className="min-w-0">
              <div className="mb-3 border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Clearance decision
                </h3>

                <p className="mt-1 text-xs leading-5 text-muted">
                  This decision is saved with the gate entry and becomes the
                  guest&apos;s latest security posture.
                </p>
              </div>

              <div className="grid gap-4">
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

                <Textarea
                  label="Security notes"
                  hint="Required for watchlist, denied, suspended, high-risk, or critical-risk entries."
                  id="gate-notes"
                  name="notes"
                  rows={6}
                  maxLength={1000}
                  placeholder="Factual security note..."
                  className="min-h-40 resize-y"
                />
              </div>
            </section>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <PendingSubmitButton pendingLabel="Recording gate entry...">
              Record gate entry
            </PendingSubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
