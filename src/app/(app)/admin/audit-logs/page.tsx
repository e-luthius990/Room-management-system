import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getAuditLogs } from "@/lib/queries/reports/get-audit-logs";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function compactJson(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  return JSON.stringify(value);
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
                  {log.action}
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  <div>{log.entity_type}</div>
                  <div className="mt-1 max-w-[220px] truncate text-xs text-neutral-500">
                    {log.entity_id ?? "—"}
                  </div>
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  <div className="max-w-[260px] whitespace-pre-wrap">
                    {log.reason ?? "—"}
                  </div>
                </td>

                <td className="px-4 py-4 text-xs text-neutral-600">
                  <div className="max-w-[260px] truncate">
                    {compactJson(log.old_value)}
                  </div>
                </td>

                <td className="px-4 py-4 text-xs text-neutral-600">
                  <div className="max-w-[260px] truncate">
                    {compactJson(log.new_value)}
                  </div>
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
