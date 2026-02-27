import type { GeocodeResult } from '@/types';
import { calculateDriveTimeEstimate } from './drive-time';

export async function geocodePostcode(
  postcode: string,
  apiKey: string
): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `https://api.nextbillion.io/postalcode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postalcode: postcode.replace(/\s/g, ''),
          country: 'United Kingdom',
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.places?.length > 0) {
        return {
          postcode,
          lat: data.places[0].lat,
          lng: data.places[0].lng,
          success: true,
          error: null,
        };
      }
    }
    return {
      postcode,
      lat: null,
      lng: null,
      success: false,
      error: `API returned ${response.status}`,
    };
  } catch (e) {
    return {
      postcode,
      lat: null,
      lng: null,
      success: false,
      error: String(e),
    };
  }
}

export async function getDirectionsDriveTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      origin: `${fromLat},${fromLng}`,
      destination: `${toLat},${toLng}`,
      mode: 'car',
    });
    const response = await fetch(
      `https://api.nextbillion.io/directions/json?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.routes?.length > 0) {
        const durationSeconds = data.routes[0].duration ?? 0;
        return Math.max(5, Math.floor(durationSeconds / 60));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getDriveTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string | null
): Promise<[number, boolean]> {
  if (apiKey) {
    const directionsTime = await getDirectionsDriveTime(
      fromLat,
      fromLng,
      toLat,
      toLng,
      apiKey
    );
    if (directionsTime !== null) return [directionsTime, true];
  }
  const estimate = calculateDriveTimeEstimate(fromLat, fromLng, toLat, toLng);
  return [estimate, false];
}
