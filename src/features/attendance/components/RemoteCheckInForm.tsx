"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  startRemoteCheckInFormAction,
  type RemoteCheckInState
} from "@/features/attendance/server/visit-report-actions";

const initialState: RemoteCheckInState = { error: null };

export function RemoteCheckInForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useActionState(startRemoteCheckInFormAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input name="storeId" type="hidden" value={storeId} />
      <SubmitButton />
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
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
      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold uppercase text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Starting..." : "Remote check in"}
    </button>
  );
}
