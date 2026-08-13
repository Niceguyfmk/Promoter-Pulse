"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  startRemoteCheckInFormAction,
  type RemoteCheckInState
} from "@/features/attendance/server/visit-report-actions";
import { ButtonLoader } from "@/shared/loading";

const initialState: RemoteCheckInState = { error: null };

export function RemoteCheckInForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useActionState(startRemoteCheckInFormAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input name="storeId" type="hidden" value={storeId} />
      <SubmitButton />
      {state.error ? (
        <p className="rounded-lg bg-danger-tint px-3 py-2 text-xs font-medium leading-5 text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-12 w-full rounded-lg border border-border bg-card px-3 text-xs font-bold uppercase text-text transition hover:border-garnet/30 hover:bg-garnet-tint hover:text-garnet disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <ButtonLoader label="Remote check in" loading={pending} loadingLabel="Starting..." />
    </button>
  );
}
