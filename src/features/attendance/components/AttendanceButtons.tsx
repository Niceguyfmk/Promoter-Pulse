"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkInAction, checkOutAction } from "../server/attendance-actions";
import { ButtonLoader, useLoading } from "@/shared/loading";

type Props = {
  shiftId: string;
  status: "scheduled" | "checked_in" | "checked_out" | "missed";
};

export function AttendanceButtons({ shiftId, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { beginOperation } = useLoading();

  const handleAction = async (type: "in" | "out") => {
    setError(null);
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const formData = new FormData();
        formData.append("shiftId", shiftId);
        formData.append("latitude", position.coords.latitude.toString());
        formData.append("longitude", position.coords.longitude.toString());

        startTransition(async () => {
          const end = beginOperation({
            kind: "mutation",
            label: type === "in" ? "Checking in" : "Checking out"
          });
          try {
            const result = type === "in"
              ? await checkInAction(formData)
              : await checkOutAction(formData);

            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          } finally {
            end();
          }
        });
      },
      (err) => {
        setError(`Failed to get location: ${err.message}`);
      }
    );
  };

  if (status === "checked_out" || status === "missed") {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}
      
      {status === "scheduled" && (
        <button
          onClick={() => handleAction("in")}
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-900 px-4 text-base font-bold text-white transition-all hover:bg-cyan-950 active:scale-[0.98] disabled:opacity-70"
        >
          <ButtonLoader label="Check in" loading={isPending} loadingLabel="Checking in..." />
        </button>
      )}

      {status === "checked_in" && (
        <button
          onClick={() => handleAction("out")}
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-base font-bold text-white transition-all hover:bg-slate-950 active:scale-[0.98] disabled:opacity-70"
        >
          <ButtonLoader label="Check out" loading={isPending} loadingLabel="Checking out..." />
        </button>
      )}
    </div>
  );
}
