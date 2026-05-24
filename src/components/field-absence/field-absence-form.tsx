"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createFieldAbsenceAction,
  type FieldAbsenceActionState,
} from "@/lib/actions/field-absences";
import { APP_ROUTES } from "@/lib/auth/routes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type FieldAbsenceFormProps = {
  stayId: string;
};

const INITIAL_STATE: FieldAbsenceActionState = {
  ok: false,
};

export function FieldAbsenceForm({ stayId }: FieldAbsenceFormProps) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    createFieldAbsenceAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, state.ok, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="stayId" value={stayId} />

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="departureAt"
            className="text-sm font-medium text-foreground"
          >
            Field departure
          </label>

          <Input
            id="departureAt"
            name="departureAt"
            type="datetime-local"
            required
          />

          {state.fieldErrors?.departureAt ? (
            <p className="text-xs text-red-600">
              {state.fieldErrors.departureAt}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="expectedReturnAt"
            className="text-sm font-medium text-foreground"
          >
            Expected return
          </label>

          <Input
            id="expectedReturnAt"
            name="expectedReturnAt"
            type="datetime-local"
            required
          />

          {state.fieldErrors?.expectedReturnAt ? (
            <p className="text-xs text-red-600">
              {state.fieldErrors.expectedReturnAt}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="destination"
            className="text-sm font-medium text-foreground"
          >
            Destination
          </label>

          <Input
            id="destination"
            name="destination"
            placeholder="Field site, project area, location..."
          />

          {state.fieldErrors?.destination ? (
            <p className="text-xs text-red-600">
              {state.fieldErrors.destination}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reason"
            className="text-sm font-medium text-foreground"
          >
            Reason
          </label>

          <Input
            id="reason"
            name="reason"
            placeholder="Work rotation, project deployment..."
          />

          {state.fieldErrors?.reason ? (
            <p className="text-xs text-red-600">{state.fieldErrors.reason}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-foreground">
          Notes
        </label>

        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Internal notes for reception or management"
        />

        {state.fieldErrors?.notes ? (
          <p className="text-xs text-red-600">{state.fieldErrors.notes}</p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => router.push(APP_ROUTES.stays.detail(stayId))}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Mark Field Absence"}
        </Button>
      </div>
    </form>
  );
}
