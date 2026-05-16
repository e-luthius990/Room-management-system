import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getGuestDocumentReviewQueue } from "@/lib/queries/guest-documents/get-document-review-queue";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value: number | null): string {
  if (value === null || value < 0) {
    return "—";
  }

  if (value === 0) {
    return "0 KB";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function GuestDocumentReviewPage(): Promise<React.JSX.Element> {
  await requirePermission("guest_documents.review");

  const documents = await getGuestDocumentReviewQueue();

  return (
    <div>
      <PageHeader
        title="Guest Document Review"
        description="Review pending guest documents and open private files through short-lived signed URLs."
      />

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Camp</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No guest documents are pending review.
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-neutral-950">
                        {document.guest_name}
                      </div>

                      <Link
                        href={`/guests/${document.guest_id}`}
                        className="mt-1 inline-block text-xs font-semibold text-neutral-700 underline underline-offset-4"
                      >
                        Open guest
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {document.camp_name}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatLabel(document.document_type)}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      <div className="max-w-[280px] truncate">
                        {document.original_filename ?? "Private file"}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {document.mime_type ?? "Unknown type"} ·{" "}
                        {formatBytes(document.size_bytes)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatDate(document.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {formatLabel(document.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/guest-documents/${document.id}`}
                        className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
