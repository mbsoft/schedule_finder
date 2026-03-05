import type { Gap } from '@/types';
import { getConfig } from '@/lib/storage/data-access';
import { getSurveyor, getSchedule, saveGaps } from '@/lib/storage/data-access';
import { timeToMinutes, minutesToTime } from './time-utils';
import { formatDateInTimezone, weekdayInTimezone } from './timezone';
import { randomUUID } from 'crypto';

export async function findGaps(surveyorId: string): Promise<Gap[]> {
  const config = await getConfig();
  const surveyor = await getSurveyor(surveyorId);
  if (!surveyor) {
    throw new Error('Surveyor not found');
  }

  const schedule = await getSchedule(surveyorId);

  const gaps: Gap[] = [];
  const workStart = timeToMinutes(config.working_hours_start);
  const workEnd = timeToMinutes(config.working_hours_end);
  const surveyDuration = config.survey_duration_mins;
  const buffer = config.buffer_mins_each_side;
  const requiredWindow = surveyDuration + buffer * 2 + 30; // 30 min travel estimate

  // Group schedule by date
  const scheduleByDate: Record<string, typeof schedule> = {};
  for (const entry of schedule) {
    if (!scheduleByDate[entry.date]) {
      scheduleByDate[entry.date] = [];
    }
    scheduleByDate[entry.date].push(entry);
  }

  // Generate dates for booking window using configured timezone
  const tz = config.timezone || 'Europe/London';
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Noon to avoid DST edge cases

  for (let dayOffset = 0; dayOffset < config.booking_window_days; dayOffset++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    const dateStr = formatDateInTimezone(checkDate, tz);
    const dayName = weekdayInTimezone(checkDate, tz);

    // Skip weekends if not available
    if (!config.weekends_available && (dayName === 'Saturday' || dayName === 'Sunday')) {
      continue;
    }

    const daySchedule = (scheduleByDate[dateStr] || []).sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    // Count jobs to determine density
    const jobCount = daySchedule.filter(e => e.job_type !== 'BLOCK').length;
    const isDense = jobCount >= config.dense_day_threshold;
    const isSparse = jobCount <= config.sparse_day_threshold;

    // Find gaps
    let currentTime = workStart;
    let prevPostcode = surveyor.home_postcode || '';

    for (const entry of daySchedule) {
      const entryStart = timeToMinutes(entry.start_time);
      const entryEnd = timeToMinutes(entry.end_time);

      const gapMins = entryStart - currentTime;

      if (gapMins >= requiredWindow) {
        let gapType: 'STRONG' | 'TIGHT' | 'BLOCKED';
        let classification: string;

        if (gapMins >= requiredWindow + 60) {
          gapType = 'STRONG';
          classification = 'STRONG OPPORTUNITY';
        } else {
          gapType = 'TIGHT';
          classification = 'TIGHT - VIABLE';
        }

        const nextPostcode = entry.postcode || '';

        gaps.push({
          id: randomUUID(),
          surveyor_id: surveyorId,
          date: dateStr,
          day_name: dayName,
          gap_start: minutesToTime(currentTime),
          gap_end: minutesToTime(entryStart),
          gap_mins: gapMins,
          from_postcode: prevPostcode,
          to_postcode: nextPostcode,
          gap_type: gapType,
          classification,
          notes: isDense ? 'Dense day' : isSparse ? 'Sparse day' : 'Normal day',
        });
      }

      currentTime = entryEnd;
      prevPostcode = entry.postcode || '';
    }

    // Check gap after last job until work end
    const endGapMins = workEnd - currentTime;
    if (endGapMins >= requiredWindow) {
      let gapType: 'STRONG' | 'TIGHT';
      let classification: string;

      if (endGapMins >= requiredWindow + 60) {
        gapType = 'STRONG';
        classification = 'STRONG OPPORTUNITY';
      } else {
        gapType = 'TIGHT';
        classification = 'TIGHT - VIABLE';
      }

      gaps.push({
        id: randomUUID(),
        surveyor_id: surveyorId,
        date: dateStr,
        day_name: dayName,
        gap_start: minutesToTime(currentTime),
        gap_end: minutesToTime(workEnd),
        gap_mins: endGapMins,
        from_postcode: prevPostcode,
        to_postcode: surveyor.home_postcode || '',
        gap_type: gapType,
        classification,
        notes: 'End of day slot',
      });
    }
  }

  // Save gaps
  await saveGaps(surveyorId, gaps);

  return gaps;
}
