import { NextResponse } from 'next/server';
import { getConfig, updateConfig } from '@/lib/storage/data-access';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const updated = await updateConfig(body);
  return NextResponse.json(updated);
}
