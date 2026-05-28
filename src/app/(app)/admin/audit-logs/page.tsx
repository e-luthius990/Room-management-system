import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getAuditLogs } from "@/lib/queries/reports/get-audit-logs";
import {
  formatReadableEntries,
  formatReadableLabel,
  formatReadableValue,
} from "@/lib/format/human-readable";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AuditLogsPage() {
  await requirePermission("audit_logs.view");

  const logs = await getAuditLogs();

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Review sensitive workflow actions, security-relevant updates, and operational mutations."
      />

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Old</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {logs.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="px-4 py-4 font-medium text-neutral-950">
                  {formatReadableLabel(log.action)}
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  <div>{formatReadableLabel(log.entity_type)}</div>
                  <div className="mt-1 max-w-[220px] truncate text-xs text-neutral-500">
                    {log.entity_id ? formatReadableValue(log.entity_id) : "-"}
                  </div>
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  <div className="max-w-[260px] whitespace-pre-wrap">
                    {log.reason ?? "-"}
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-neutral-600">
                  <ReadableChanges
                    value={log.old_value}
                    emptyLabel="No previous values"
                  />
                </td>

                <td className="px-4 py-4 text-sm text-neutral-600">
                  <ReadableChanges
                    value={log.new_value}
                    emptyLabel="No new values"
                  />
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {formatDateTime(log.created_at)}
                </td>
              </tr>
            ))}

            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-neutral-500"
                >
                  No audit logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadableChanges({
  value,
  emptyLabel,
}: {
  value: Record<string, unknown> | null;
  emptyLabel: string;
}): React.JSX.Element {
  const entries = formatReadableEntries(value);

  if (entries.length === 0) {
    return <span className="text-neutral-400">{emptyLabel}</span>;
  }

  return (
    <dl className="grid max-w-[280px] gap-2">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {entry.label}
          </dt>
          <dd className="mt-0.5 break-words leading-5 text-neutral-700">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
