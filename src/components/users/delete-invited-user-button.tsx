// src/components/users/delete-invited-user-button.tsx

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInvitedUserAction,
  type DeleteInvitedUserActionResult,
} from "@/lib/actions/users/delete-invited-user-action";

type DeleteInvitedUserButtonProps = {
  userId: string;
  fullName: string;
  email: string | null;
};

export function DeleteInvitedUserButton({
  userId,
  fullName,
  email,
}: DeleteInvitedUserButtonProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<DeleteInvitedUserActionResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const reason = useMemo(() => {
    return `Super Admin permanently deleted invited user ${fullName}${
      email ? ` (${email})` : ""
    } before account activation.`;
  }, [email, fullName]);

  const canDelete = confirmText === "DELETE" && !isPending;

  function handleDelete(): void {
    if (!canDelete) return;

    startTransition(async () => {
      const response = await deleteInvitedUserAction({
        userId,
        reason,
      });

      setResult(response);

      if (response.ok) {
        setOpen(false);
        setConfirmText("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
              Permanent delete
            </p>

            <h2 className="mt-2 text-xl font-bold text-neutral-950">
              Delete invited user?
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This removes the profile, role assignment, camp access, and
              Supabase Auth account. This cannot be undone.
            </p>

            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-semibold text-neutral-950">{fullName}</p>
              {email ? (
                <p className="mt-1 text-sm text-neutral-600">{email}</p>
              ) : null}
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-neutral-800">
                Type DELETE to confirm
              </span>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                placeholder="DELETE"
              />
            </label>

            {result && !result.ok ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {result.message}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canDelete}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
