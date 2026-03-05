import { NextResponse } from 'next/server';
import { getApiKey, getSurveyor, getSchedule } from '@/lib/storage/data-access';
import { geocodePostcode } from '@/lib/business/geocoding';

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  type: 'home' | 'job';
  postcode: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surveyorId = searchParams.get('surveyor_id') || 'josh-001';
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 400 });
  }

  const surveyor = await getSurveyor(surveyorId);
  if (!surveyor) {
    return NextResponse.json({ error: 'Surveyor not found' }, { status: 404 });
  }

  const schedule = await getSchedule(surveyorId);
  const daySchedule = schedule
    .filter((e) => e.date === date && e.job_type !== 'BLOCK')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Geocode home postcode
  const homeGeo = await geocodePostcode(surveyor.home_postcode, apiKey);
  if (!homeGeo.success || homeGeo.lat == null || homeGeo.lng == null) {
    return NextResponse.json({ error: 'Could not geocode home postcode' }, { status: 400 });
  }

  const waypoints: Waypoint[] = [
    { lat: homeGeo.lat, lng: homeGeo.lng, label: 'Home', type: 'home', postcode: surveyor.home_postcode },
  ];

  // Geocode each job postcode
  for (const entry of daySchedule) {
    if (!entry.postcode) continue;
    // Use existing lat/lng from schedule entry if available
    if (entry.lat != null && entry.lng != null) {
      waypoints.push({
        lat: entry.lat,
        lng: entry.lng,
        label: entry.area || entry.postcode,
        type: 'job',
        postcode: entry.postcode,
      });
    } else {
      const geo = await geocodePostcode(entry.postcode, apiKey);
      if (geo.success && geo.lat != null && geo.lng != null) {
        waypoints.push({
          lat: geo.lat,
          lng: geo.lng,
          label: entry.area || entry.postcode,
          type: 'job',
          postcode: entry.postcode,
        });
      }
    }
  }

  // Add return home
  waypoints.push({
    lat: homeGeo.lat,
    lng: homeGeo.lng,
    label: 'Home (return)',
    type: 'home',
    postcode: surveyor.home_postcode,
  });

  if (waypoints.length < 2) {
    return NextResponse.json({ waypoints, geometry: null });
  }

  // Fetch route geometry from NextBillion directions API
  // Use waypoints mode for multi-stop routes
  const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
  const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
  const intermediates = waypoints
    .slice(1, -1)
    .map((w) => `${w.lat},${w.lng}`)
    .join('|');

  try {
    const params = new URLSearchParams({
      key: apiKey,
      origin,
      destination,
      mode: 'car',
      ...(intermediates ? { waypoints: intermediates } : {}),
    });

    const url = `https://api.nextbillion.io/directions/json?${params}`;
    console.log(`[NB Route] Fetching route geometry for ${waypoints.length} waypoints`);

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const data = await response.json();
      if (data.routes?.length > 0) {
        const route = data.routes[0];
        return NextResponse.json({
          waypoints,
          geometry: route.geometry,
          duration_seconds: route.duration,
          distance_meters: route.distance,
        });
      }
    }

    // Return waypoints even if route fails (markers can still show)
    return NextResponse.json({ waypoints, geometry: null });
  } catch (e) {
    console.error('[NB Route] Error:', e);
    return NextResponse.json({ waypoints, geometry: null });
  }
}
