import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'MTLL Slot Engine API v1.0' });
}
