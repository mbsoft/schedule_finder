import { NextResponse } from 'next/server';
import { saveApiKey } from '@/lib/storage/data-access';

export async function POST(request: Request) {
  const body = await request.json();
  await saveApiKey(body.nextbillion_key);
  return NextResponse.json({ success: true, message: 'API key saved' });
}
