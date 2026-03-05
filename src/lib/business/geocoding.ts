import type { GeocodeResult } from '@/types';
import { calculateDriveTimeEstimate } from './drive-time';

// Round coordinates to 5 decimal places (~1m precision) for cache key stability
function directionsCacheKey(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return `${fromLat.toFixed(5)},${fromLng.toFixed(5)}->${toLat.toFixed(5)},${toLng.toFixed(5)}`;
}

const directionsCache = new Map<string, number>();
const geocodeCache = new Map<string, GeocodeResult>();

export async function geocodePostcode(
  postcode: string,
  apiKey: string
): Promise<GeocodeResult> {
  const cacheKey = postcode.replace(/\s/g, '').toUpperCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    console.log(`[NB Geocode] Cache hit: "${postcode}" -> ${cached.lat}, ${cached.lng}`);
    return cached;
  }

  console.log(`[NB Geocode] Request: "${postcode}"`);
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
      console.log(`[NB Geocode] Raw response for "${postcode}":`, JSON.stringify(data).slice(0, 500));
      if (data.places?.length > 0) {
        const place = data.places[0];
        const lat = place.geopoint?.lat ?? place.lat;
        const lng = place.geopoint?.lng ?? place.lng;
        console.log(`[NB Geocode] Result: "${postcode}" -> ${lat}, ${lng}`);
        const result: GeocodeResult = { postcode, lat, lng, success: true, error: null };
        geocodeCache.set(cacheKey, result);
        return result;
      }
      console.log(`[NB Geocode] No places found for "${postcode}"`);
    } else {
      console.log(`[NB Geocode] Error: HTTP ${response.status} for "${postcode}"`);
    }
    return {
      postcode,
      lat: null,
      lng: null,
      success: false,
      error: `API returned ${response.status}`,
    };
  } catch (e) {
    console.log(`[NB Geocode] Error: ${e} for "${postcode}"`);
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
  const cacheKey = directionsCacheKey(fromLat, fromLng, toLat, toLng);
  const cached = directionsCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[NB Directions] Cache hit: ${cacheKey} -> ${cached} min`);
    return cached;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      origin: `${fromLat},${fromLng}`,
      destination: `${toLat},${toLng}`,
      mode: 'car',
    });
    const url = `https://api.nextbillion.io/directions/json?${params}`;
    console.log(`[NB Directions] Request: ${fromLat},${fromLng} -> ${toLat},${toLng}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const data = await response.json();
      if (data.routes?.length > 0) {
        const durationSeconds = data.routes[0].duration ?? 0;
        const driveMinutes = Math.max(5, Math.floor(durationSeconds / 60));
        const distanceMeters = data.routes[0].distance ?? 0;
        console.log(`[NB Directions] Result: ${driveMinutes} min, ${(distanceMeters / 1609.34).toFixed(1)} miles`);
        directionsCache.set(cacheKey, driveMinutes);
        return driveMinutes;
      }
      console.log('[NB Directions] No routes returned');
    } else {
      console.log(`[NB Directions] Error: HTTP ${response.status}`);
    }
    return null;
  } catch (e) {
    console.log(`[NB Directions] Error: ${e}`);
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
