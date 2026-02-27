import { NextResponse } from 'next/server';
import { getSurveyors, createSurveyor } from '@/lib/storage/data-access';
import type { Surveyor } from '@/types';
import { randomUUID } from 'crypto';

export async function GET() {
  const surveyors = await getSurveyors();
  return NextResponse.json(surveyors);
}

export async function POST(request: Request) {
  const body = await request.json();
  const surveyor: Surveyor = {
    id: body.id || randomUUID(),
    name: body.name,
    home_postcode: body.home_postcode,
    home_lat: body.home_lat ?? null,
    home_lng: body.home_lng ?? null,
    working_days: body.working_days ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    territory_postcodes: body.territory_postcodes ?? [],
    max_jobs_per_day: body.max_jobs_per_day ?? 5,
    active: body.active ?? true,
  };
  const created = await createSurveyor(surveyor);
  return NextResponse.json(created);
}
