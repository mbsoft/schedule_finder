import type { PreferenceFilterRequest, SlotOffer } from '@/types';
import { getConfig, getGaps } from '@/lib/storage/data-access';
import { timeToMinutes, minutesToTime } from './time-utils';

export async function filterByPreferences(
  request: PreferenceFilterRequest,
  surveyorId: string
): Promise<SlotOffer[]> {
  const config = await getConfig();
  const gaps = await getGaps(surveyorId);

  // Filter out BLOCKED gaps
  const viableGaps = gaps.filter(g => g.gap_type !== 'BLOCKED');

  const morningEnd = timeToMinutes('12:00');
  const afternoonStart = timeToMinutes('12:00');
  const afternoonEnd = timeToMinutes('17:00');

  const offers: SlotOffer[] = [];
  let rank = 0;

  for (const gap of viableGaps) {
    const gapStartMins = timeToMinutes(gap.gap_start);
    let preferenceMatch = true;

    // Check day preference
    if (
      request.preferred_day &&
      gap.day_name.toLowerCase() !== request.preferred_day.toLowerCase()
    ) {
      preferenceMatch = false;
    }

    // Check specific date
    if (request.specific_date && gap.date !== request.specific_date) {
      preferenceMatch = false;
    }

    // Check time of day preference
    if (request.time_of_day) {
      if (
        request.time_of_day.toLowerCase() === 'morning' &&
        gapStartMins >= morningEnd
      ) {
        preferenceMatch = false;
      } else if (
        request.time_of_day.toLowerCase() === 'afternoon' &&
        (gapStartMins < afternoonStart || gapStartMins >= afternoonEnd)
      ) {
        preferenceMatch = false;
      }
    }

    // Calculate slot times (middle of gap, accounting for travel)
    const buffer = config.buffer_mins_each_side;
    const surveyDuration = config.survey_duration_mins;
    const slotStartMins = gapStartMins + 20 + buffer; // 20 min travel estimate
    const slotEndMins = slotStartMins + surveyDuration;

    rank += 1;

    offers.push({
      gap_id: gap.id,
      date: gap.date,
      day_name: gap.day_name,
      slot_start: minutesToTime(slotStartMins),
      slot_end: minutesToTime(slotEndMins),
      preference_match: preferenceMatch,
      rank: preferenceMatch ? rank : rank + 100,
      area: gap.notes,
    });
  }

  // Sort by preference match (true first), then by rank
  offers.sort((a, b) => {
    if (a.preference_match !== b.preference_match) {
      return a.preference_match ? -1 : 1;
    }
    return a.rank - b.rank;
  });

  // Re-rank
  for (let i = 0; i < offers.length; i++) {
    offers[i].rank = i + 1;
  }

  return offers;
}
