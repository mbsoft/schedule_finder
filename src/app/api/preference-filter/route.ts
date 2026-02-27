import { NextRequest, NextResponse } from 'next/server';
import { filterByPreferences } from '@/lib/business/preference-filter';

export async function POST(request: NextRequest) {
  const surveyorId = request.nextUrl.searchParams.get('surveyor_id');
  if (!surveyorId) {
    return NextResponse.json({ detail: 'surveyor_id required' }, { status: 400 });
  }

  const body = await request.json();
  const offers = await filterByPreferences(
    {
      preferred_day: body.preferred_day ?? null,
      time_of_day: body.time_of_day ?? null,
      specific_date: body.specific_date ?? null,
    },
    surveyorId
  );
  return NextResponse.json(offers);
}
