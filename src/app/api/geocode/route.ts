import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';
import { geocodePostcode } from '@/lib/business/geocoding';

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { detail: 'NextBillion API key not configured' },
      { status: 400 }
    );
  }
  const result = await geocodePostcode(body.postcode, apiKey);
  return NextResponse.json(result);
}
