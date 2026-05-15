import { calculateHaversineDistanceMeters, type Coordinates } from "@/shared/location/distance";

export const DEFAULT_ALLOWED_RADIUS_METERS = 100;
export const MAX_GPS_ACCURACY_METERS = 100;
export const OUTSIDE_STORE_RADIUS_MESSAGE = "You appear to be outside the assigned store radius.";
export const POOR_GPS_ACCURACY_MESSAGE =
  "Your GPS accuracy is too low for check-in. Please retry from a clearer location.";

export type GpsCheckInMetadata = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
};

export type AssignedPlaceLocation = Coordinates & {
  allowedRadiusMeters?: number | null;
};

export type GpsValidationResult =
  | {
      allowed: true;
      distanceMeters: number;
      allowedRadiusMeters: number;
    }
  | {
      allowed: false;
      reason: "poor_accuracy" | "outside_radius";
      message: string;
      distanceMeters: number;
      allowedRadiusMeters: number;
    };

export function validateGpsCheckIn(
  checkIn: GpsCheckInMetadata,
  place: AssignedPlaceLocation
): GpsValidationResult {
  const allowedRadiusMeters = place.allowedRadiusMeters ?? DEFAULT_ALLOWED_RADIUS_METERS;
  const distanceMeters = calculateHaversineDistanceMeters(
    { latitude: checkIn.latitude, longitude: checkIn.longitude },
    place
  );

  if (checkIn.accuracy > MAX_GPS_ACCURACY_METERS) {
    return {
      allowed: false,
      reason: "poor_accuracy",
      message: POOR_GPS_ACCURACY_MESSAGE,
      distanceMeters,
      allowedRadiusMeters
    };
  }

  if (distanceMeters > allowedRadiusMeters) {
    return {
      allowed: false,
      reason: "outside_radius",
      message: OUTSIDE_STORE_RADIUS_MESSAGE,
      distanceMeters,
      allowedRadiusMeters
    };
  }

  return {
    allowed: true,
    distanceMeters,
    allowedRadiusMeters
  };
}

