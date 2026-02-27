import { NextRequest, NextResponse } from 'next/server';
import { getConfig, getSchedule, getGaps } from '@/lib/storage/data-access';

export async function GET(request: NextRequest) {
  const surveyorId = request.nextUrl.searchParams.get('surveyor_id');
  if (!surveyorId) {
    return NextResponse.json({ detail: 'surveyor_id required' }, { status: 400 });
  }

  const config = await getConfig();
  const schedule = await getSchedule(surveyorId);
  const gaps = await getGaps(surveyorId);

  const totalJobs = schedule.filter(e => e.job_type !== 'BLOCK').length;
  const totalGaps = gaps.length;
  const strongGaps = gaps.filter(g => g.gap_type === 'STRONG').length;
  const tightGaps = gaps.filter(g => g.gap_type === 'TIGHT').length;

  // Jobs by day
  const jobsByDay: Record<string, number> = {};
  for (const entry of schedule) {
    const day = entry.day_name || 'Unknown';
    if (!jobsByDay[day]) jobsByDay[day] = 0;
    if (entry.job_type !== 'BLOCK') jobsByDay[day] += 1;
  }

  const denseDays = Object.entries(jobsByDay)
    .filter(([, count]) => count >= config.dense_day_threshold)
    .map(([day]) => day);

  const sparseDays = Object.entries(jobsByDay)
    .filter(([, count]) => count <= config.sparse_day_threshold)
    .map(([day]) => day);

  return NextResponse.json({
    total_jobs: totalJobs,
    total_gaps: totalGaps,
    strong_gaps: strongGaps,
    tight_gaps: tightGaps,
    jobs_by_day: jobsByDay,
    dense_days: denseDays,
    sparse_days: sparseDays,
    booking_window_days: config.booking_window_days,
    config,
  });
}
