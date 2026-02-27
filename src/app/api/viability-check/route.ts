import { NextResponse } from 'next/server';
import { checkViability } from '@/lib/business/viability';
import { getGaps, getSurveyors } from '@/lib/storage/data-access';
import type { Gap } from '@/types';

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const surveyors = await getSurveyors();

    let allGaps: Gap[] = [];
    for (const surveyor of surveyors) {
      const gaps = await getGaps(surveyor.id);
      allGaps = allGaps.concat(gaps);
    }

    const result = await checkViability(
      { lead_postcode: body.lead_postcode, gap_id: body.gap_id },
      allGaps
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ detail: message }, { status: 404 });
  }
}
