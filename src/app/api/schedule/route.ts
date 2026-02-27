import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, createScheduleEntry } from '@/lib/storage/data-access';
import type { ScheduleEntry } from '@/types';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  const surveyorId = request.nextUrl.searchParams.get('surveyor_id') || undefined;
  const date = request.nextUrl.searchParams.get('date') || undefined;
  const schedule = await getSchedule(surveyorId, date);
  return NextResponse.json(schedule);
}

export async function POST(request: Request) {
  const body = await request.json();
  const entry: ScheduleEntry = {
    id: body.id || randomUUID(),
    surveyor_id: body.surveyor_id,
    date: body.date,
    day_name: body.day_name,
    start_time: body.start_time,
    end_time: body.end_time,
    postcode: body.postcode,
    job_type: body.job_type ?? 'Survey',
    area: body.area ?? null,
    notes: body.notes ?? null,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
  };
  const created = await createScheduleEntry(entry);
  return NextResponse.json(created);
}
