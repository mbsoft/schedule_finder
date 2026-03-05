import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';

const NB_ORIGIN = 'https://api.nextbillion.io';

// Rewrite NB URL to local proxy, stripping the API key.
// Uses string manipulation instead of new URL() to preserve template tokens like {fontstack}, {range}, {z}/{x}/{y}
function rewriteNbUrl(urlStr: string, origin: string): string {
  // Strip the origin
  const path = urlStr.slice(NB_ORIGIN.length); // e.g. "/tt/map/2/tile/basic/{z}/{x}/{y}.pbf?altver=2.1&key=abc"
  // Remove key param from query string
  const cleaned = path.replace(/([?&])key=[^&]*(&?)/, (_, prefix, suffix) => {
    // If key was the only param after ?, remove the ?; otherwise keep separator
    if (prefix === '?' && !suffix) return '';
    if (prefix === '?' && suffix === '&') return '?';
    return prefix === '&' ? '' : '';
  });
  return `${origin}/api/map-proxy${cleaned}`;
}

// Recursively rewrite all NB URLs in the style JSON
function rewriteUrls(obj: unknown, origin: string): unknown {
  if (typeof obj === 'string' && obj.startsWith(NB_ORIGIN)) {
    return rewriteNbUrl(obj, origin);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => rewriteUrls(item, origin));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = rewriteUrls(v, origin);
    }
    return result;
  }
  return obj;
}

export async function GET(request: Request) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 400 });
  }

  try {
    const styleUrl = `${NB_ORIGIN}/tt/style/1/style/22.2.1-9?map=2/basic_street-dark&key=${apiKey}`;
    const response = await fetch(styleUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return NextResponse.json({ error: `Style fetch failed: ${response.status}` }, { status: 502 });
    }
    // Fix broken HSL values in the NB style (e.g. "24%%" -> "24%")
    const rawText = await response.text();
    const fixedText = rawText.replace(/%%/g, '%');
    const styleJson = JSON.parse(fixedText);

    // Rewrite all NB URLs to absolute local proxy URLs (removes API key from client)
    // Use forwarded headers for the public origin (Cloud Run sets X-Forwarded-Host/Proto)
    const headers = new Headers(request.headers);
    const host = headers.get('x-forwarded-host') || headers.get('host') || new URL(request.url).host;
    const proto = headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;
    const rewritten = rewriteUrls(styleJson, origin);
    return NextResponse.json(rewritten);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
