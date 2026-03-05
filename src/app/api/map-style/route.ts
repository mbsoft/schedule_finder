import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';

export async function GET() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 400 });
  }

  // Proxy the full style JSON so MapLibre can consume it directly
  try {
    const styleUrl = `https://api.nextbillion.io/tt/style/1/style/22.2.1-9?map=2/basic_street-dark&key=${apiKey}`;
    const response = await fetch(styleUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return NextResponse.json({ error: `Style fetch failed: ${response.status}` }, { status: 502 });
    }
    // Fix broken HSL values in the NB style (e.g. "24%%" -> "24%")
    const rawText = await response.text();
    const fixedText = rawText.replace(/%%/g, '%');
    const styleJson = JSON.parse(fixedText);
    return NextResponse.json(styleJson);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
