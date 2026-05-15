"use client";

import { useState, useTransition } from "react";

import { startGpsCheckInAction } from "../server/visit-report-actions";
import {
  validateGpsCheckIn,
  type AssignedPlaceLocation
} from "../lib/gps-validation";
import { requestOneTimeGpsPosition, type GpsPermissionState } from "../services/gps-check-in-service";

type Props = {
  storeId: string;
  storeLocation: {
    latitude: number | null;
    longitude: number | null;
    allowedRadiusMeters: number | null;
  };
};

export function GpsCheckInButton({ storeId, storeLocation }: Props) {
  const [permissionState, setPermissionState] = useState<GpsPermissionState>("idle");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const canVerifyLocation = storeLocation.latitude != null && storeLocation.longitude != null;
  const isLoading = permissionState === "requesting" || isPending;

  async function handleCheckIn() {
    setMessage(null);

    if (!canVerifyLocation) {
      setMessage("Store location has not been configured yet.");
      return;
    }

    setPermissionState("requesting");

    let position;
    try {
      position = await requestOneTimeGpsPosition();
      setPermissionState("ready");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to read your current location. Please retry.";
      setPermissionState(errorMessage.toLowerCase().includes("denied") ? "permission-denied" : "unsupported");
      setMessage(errorMessage);
      return;
    }

    const validation = validateGpsCheckIn(position, storeLocation as AssignedPlaceLocation);
    if (!validation.allowed) {
      setMessage(validation.message);
      return;
    }

    const formData = new FormData();
    formData.append("storeId", storeId);
    formData.append("latitude", String(position.latitude));
    formData.append("longitude", String(position.longitude));
    formData.append("accuracy", String(position.accuracy));
    formData.append("timestamp", position.timestamp);

    startTransition(async () => {
      const result = await startGpsCheckInAction(formData);
      if (result?.error) {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        className="h-12 w-full rounded-xl bg-cyan-900 px-3 text-xs font-bold uppercase text-white transition hover:bg-cyan-950 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading || !canVerifyLocation}
        onClick={handleCheckIn}
        type="button"
      >
        {isLoading ? "Verifying GPS..." : "Check in"}
      </button>
      {message ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800">
          {message}
        </p>
      ) : null}
      {!canVerifyLocation ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800">
          Store location has not been configured yet.
        </p>
      ) : null}
    </div>
  );
}
