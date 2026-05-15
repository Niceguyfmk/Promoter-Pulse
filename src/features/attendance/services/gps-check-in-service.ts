"use client";

import type { GpsCheckInMetadata } from "../lib/gps-validation";

export type GpsPermissionState = "idle" | "requesting" | "permission-denied" | "unsupported" | "ready";

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000
};

export function requestOneTimeGpsPosition(): Promise<GpsCheckInMetadata> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is not supported by your browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied. Enable location access to check in."));
          return;
        }

        reject(new Error(error.message || "Unable to read your current location. Please retry."));
      },
      GEOLOCATION_OPTIONS
    );
  });
}

