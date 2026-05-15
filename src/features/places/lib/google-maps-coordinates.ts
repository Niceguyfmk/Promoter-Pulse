export type ParsedCoordinates = {
  latitude: number;
  longitude: number;
};

const COORDINATE_PATTERN = /(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/;

export function parseGoogleMapsCoordinates(value: string): ParsedCoordinates | null {
  const decoded = decodeURIComponent(value.trim());
  const atMatch = decoded.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  const queryMatch = decoded.match(/[?&](?:q|query|ll)=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  const plainMatch = decoded.match(COORDINATE_PATTERN);
  const match = atMatch || queryMatch || plainMatch;

  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

