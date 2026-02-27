import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';

export async function GET() {
  const key = await getApiKey();
  return NextResponse.json({ has_key: key !== null && key.length > 0 });
}
