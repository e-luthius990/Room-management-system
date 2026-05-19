// src/components/users/delete-invited-user-button.tsx

"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInvitedUserAction,
  type DeleteInvitedUserActionResult,
} from "@/lib/actions/users/delete-invited-user-action";
import { cn } from "@/lib/utils/cn";

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
  const titleId = useId();
  const descriptionId = useId();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<DeleteInvitedUserActionResult | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const isBusy = isDeleting || isRefreshing;

  const reason = useMemo(() => {
    return `Super Admin permanently deleted invited user ${fullName}${
      email ? ` (${email})` : ""
    } before account activation.`;
  }, [email, fullName]);

  const canDelete = confirmText === "DELETE" && !isBusy;

  function closeDialog(): void {
    if (isBusy) {
      return;
    }

    setOpen(false);
    setConfirmText("");
    setResult(null);
  }

  async function handleDelete(): Promise<void> {
    if (!canDelete) return;

    setIsDeleting(true);
    setResult(null);

    try {
      const response = await deleteInvitedUserAction({
        userId,
        reason,
      });

      setResult(response);

      if (response.ok) {
        setOpen(false);
        setConfirmText("");

        startRefreshTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setResult({
        ok: false,
        message: "Failed to delete invited user. Try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="btn-danger btn-sm"
      >
        Delete
      </button>

      {open ? (
        <div
          className="modal-backdrop flex items-center justify-center px-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-floating"
          >
            <div className="page-kicker text-danger-700">Permanent delete</div>

            <h2
              id={titleId}
              className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground"
            >
              Delete invited user?
            </h2>

            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
              This removes the profile, role assignment, camp access, and
              Supabase Auth account. This cannot be undone.
            </p>

            <div className="mt-5 rounded-2xl border border-border bg-surface-2 p-4">
              <p className="font-semibold text-foreground">{fullName}</p>

              {email ? (
                <p className="mt-1 text-sm text-muted">{email}</p>
              ) : null}
            </div>

            <label className="field-group mt-5 block">
              <span className="field-label">Type DELETE to confirm</span>

              <input
                value={confirmText}
                disabled={isBusy}
                onChange={(event) => setConfirmText(event.target.value)}
                className="input mt-2"
                placeholder="DELETE"
                autoComplete="off"
              />
            </label>

            {result && !result.ok ? (
              <div className="alert alert-danger mt-4">{result.message}</div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isBusy}
                onClick={closeDialog}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canDelete}
                onClick={() => {
                  void handleDelete();
                }}
                aria-busy={isDeleting}
                className={cn("btn-danger", !canDelete && "opacity-55")}
              >
                {isDeleting ? (
                  <>
                    <span aria-hidden="true" className="inline-spinner" />
                    Deleting...
                  </>
                ) : (
                  "Delete permanently"
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
