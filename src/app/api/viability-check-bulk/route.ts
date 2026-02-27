import { NextRequest, NextResponse } from 'next/server';
import { checkViabilityBulk } from '@/lib/business/viability';

export async function POST(request: NextRequest) {
  const leadPostcode = request.nextUrl.searchParams.get('lead_postcode');
  const surveyorId = request.nextUrl.searchParams.get('surveyor_id');

  if (!leadPostcode || !surveyorId) {
    return NextResponse.json(
      { detail: 'lead_postcode and surveyor_id required' },
      { status: 400 }
    );
  }

  const results = await checkViabilityBulk(leadPostcode, surveyorId);
  return NextResponse.json(results);
}
