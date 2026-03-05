'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Loader2 } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  type: 'home' | 'job';
  postcode: string;
}

interface RouteData {
  waypoints: Waypoint[];
  geometry: string | null;
  duration_seconds?: number;
  distance_meters?: number;
}

interface RouteMapProps {
  surveyorId: string;
  date: string | null;
  hasApiKey: boolean;
}

// Decode Google-style encoded polyline to coordinate array
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}

export function RouteMap({ surveyorId, date, hasApiKey }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Fetch route data when date changes
  useEffect(() => {
    if (!date) return;

    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/route-geometry?surveyor_id=${surveyorId}&date=${date}`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RouteData | null) => {
        if (data) setRouteData(data);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Route fetch error:', e);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [surveyorId, date]);

  // Initialize map - fetch style JSON first, then pass as object
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !hasApiKey) return;

    let cancelled = false;

    fetch('/api/map-style')
      .then((res) => {
        if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
        return res.json();
      })
      .then((styleJson: maplibregl.StyleSpecification) => {
        if (cancelled || !mapContainer.current) return;

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: styleJson,
          center: [-1.9, 52.48], // Birmingham area default
          zoom: 10,
          attributionControl: false,
        });

        map.once('load', () => setMapReady(true));
        mapRef.current = map;
      })
      .catch((e) => console.error('Map init error:', e));

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hasApiKey]);

  // Update map when route data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData || !mapReady) return;

    const applyRoute = () => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Remove existing route layer/source
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-line-outline')) map.removeLayer('route-line-outline');
      if (map.getSource('route')) map.removeSource('route');

      const { waypoints, geometry } = routeData;

      if (waypoints.length === 0) return;

      // Add markers
      waypoints.forEach((wp, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === waypoints.length - 1;
        const isHome = wp.type === 'home';

        // Skip duplicate home return marker if same coords as first
        if (isLast && isHome && waypoints.length > 1) return;

        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.width = isHome ? '32px' : '28px';
        el.style.height = isHome ? '32px' : '28px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '12px';
        el.style.cursor = 'pointer';

        if (isHome) {
          el.style.backgroundColor = '#d4f64d';
          el.style.borderColor = '#d4f64d';
          el.style.color = '#000';
          el.textContent = 'H';
        } else {
          const jobIndex = waypoints.slice(0, idx).filter((w) => w.type === 'job').length;
          el.style.backgroundColor = '#09090b';
          el.style.borderColor = '#00f0ff';
          el.style.color = '#00f0ff';
          el.textContent = String(jobIndex + 1);
        }

        const popup = new maplibregl.Popup({ offset: 16, closeButton: false })
          .setHTML(
            `<div style="padding:4px 8px;font-size:12px;color:#fafafa;background:#1a1a1e;border-radius:4px;">
              <strong>${wp.label}</strong><br/>
              <span style="color:#a1a1aa;">${wp.postcode}</span>
              ${isFirst ? '<br/><span style="color:#d4f64d;">Start</span>' : ''}
            </div>`
          );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Add route polyline
      if (geometry) {
        const coordinates = decodePolyline(geometry);

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.addLayer({
          id: 'route-line-outline',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#000000',
            'line-width': 6,
            'line-opacity': 0.4,
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00f0ff',
            'line-width': 3,
            'line-opacity': 0.9,
          },
        });

        // Fit map to route bounds
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      } else {
        // Fit to markers if no route geometry
        const bounds = new maplibregl.LngLatBounds();
        waypoints.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
        if (waypoints.length > 1) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        } else {
          map.setCenter([waypoints[0].lng, waypoints[0].lat]);
          map.setZoom(12);
        }
      }
    };

    applyRoute();
  }, [routeData, mapReady]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#09090b]/70 rounded-lg">
          <Loader2 size={24} className="animate-spin text-[#d4f64d]" />
        </div>
      )}
      {!hasApiKey && (
        <div className="flex items-center justify-center h-64 text-[#a1a1aa] text-sm">
          <MapIcon size={18} className="mr-2" />
          Configure API key to enable map
        </div>
      )}
      <div
        ref={mapContainer}
        className="w-full rounded-lg"
        style={{ height: '400px', display: hasApiKey ? 'block' : 'none' }}
      />
      {routeData && routeData.duration_seconds && routeData.distance_meters && (
        <div className="flex gap-4 mt-2 text-xs text-[#a1a1aa]">
          <span>
            Total drive: <span className="font-mono text-[#fafafa]">{Math.round(routeData.duration_seconds / 60)} min</span>
          </span>
          <span>
            Distance: <span className="font-mono text-[#fafafa]">{(routeData.distance_meters / 1609.34).toFixed(1)} miles</span>
          </span>
          <span>
            Stops: <span className="font-mono text-[#fafafa]">{routeData.waypoints.filter(w => w.type === 'job').length}</span>
          </span>
        </div>
      )}
    </div>
  );
}
