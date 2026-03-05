import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return new NextResponse('No API key configured', { status: 400 });
  }

  const { path } = await params;
  const pathStr = path.join('/');

  // Reconstruct the original NB URL, forwarding query params
  const { searchParams } = new URL(request.url);
  const targetUrl = new URL(`https://api.nextbillion.io/${pathStr}`);
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));
  targetUrl.searchParams.set('key', apiKey);

  try {
    const response = await fetch(targetUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    return new NextResponse(`Proxy error: ${String(e)}`, { status: 502 });
  }
}
