import { NextRequest, NextResponse } from 'next/server';
import { findGaps } from '@/lib/business/gap-finder';

export async function GET(request: NextRequest) {
  const surveyorId = request.nextUrl.searchParams.get('surveyor_id');
  if (!surveyorId) {
    return NextResponse.json({ detail: 'surveyor_id required' }, { status: 400 });
  }
  try {
    const gaps = await findGaps(surveyorId);
    return NextResponse.json(gaps);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (message === 'Surveyor not found') {
      return NextResponse.json({ detail: message }, { status: 404 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
