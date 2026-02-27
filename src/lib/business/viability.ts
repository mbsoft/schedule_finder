import type { ViabilityCheckRequest, ViabilityResult, BulkViabilityResult } from '@/types';
import { getConfig, getApiKey, getGaps } from '@/lib/storage/data-access';
import { geocodePostcode, getDriveTime } from './geocoding';

export async function checkViability(
  request: ViabilityCheckRequest,
  allGaps?: import('@/types').Gap[]
): Promise<ViabilityResult> {
  const config = await getConfig();
  const apiKey = await getApiKey();

  // Find the gap
  let gap;
  if (allGaps) {
    gap = allGaps.find(g => g.id === request.gap_id);
  }
  if (!gap) {
    throw new Error('Gap not found');
  }

  const surveyDuration = config.survey_duration_mins;
  const buffer = config.buffer_mins_each_side;
  const hardCap = config.max_drive_time_hard_cap_mins;
  const longThreshold = config.long_drive_threshold_mins;
  const safetyMult = config.drive_time_safety_mult;

  // Default drive times (fallback)
  let driveTimeFrom = 20;
  let driveTimeTo = 20;
  let usedDirectionsApi = false;

  if (apiKey) {
    // Step 1: Geocode lead postcode
    const leadGeo = await geocodePostcode(request.lead_postcode, apiKey);

    if (leadGeo.success && leadGeo.lat && leadGeo.lng) {
      // Geocode the "from" postcode (previous job location)
      if (gap.from_postcode && gap.from_postcode !== 'NO POSTCODE') {
        const fromGeo = await geocodePostcode(gap.from_postcode, apiKey);
        if (fromGeo.success && fromGeo.lat && fromGeo.lng) {
          const [time, usedApi] = await getDriveTime(
            fromGeo.lat,
            fromGeo.lng,
            leadGeo.lat,
            leadGeo.lng,
            apiKey
          );
          driveTimeFrom = time;
          if (usedApi) usedDirectionsApi = true;
        }
      }

      // Geocode the "to" postcode (next job location)
      if (gap.to_postcode && gap.to_postcode !== 'NO POSTCODE') {
        const toGeo = await geocodePostcode(gap.to_postcode, apiKey);
        if (toGeo.success && toGeo.lat && toGeo.lng) {
          const [time, usedApi] = await getDriveTime(
            leadGeo.lat,
            leadGeo.lng,
            toGeo.lat,
            toGeo.lng,
            apiKey
          );
          driveTimeTo = time;
          if (usedApi) usedDirectionsApi = true;
        }
      }
    }
  }

  // Apply safety multiplier
  driveTimeFrom = Math.floor(driveTimeFrom * safetyMult);
  driveTimeTo = Math.floor(driveTimeTo * safetyMult);

  // Calculate required window
  const requiredWindow = driveTimeFrom + buffer + surveyDuration + buffer + driveTimeTo;
  const availableGap = gap.gap_mins;

  // Check viability
  let viable = true;
  let reason = 'VIABLE';
  let usesLongDrive = false;

  if (availableGap < requiredWindow) {
    viable = false;
    reason = `Gap too small (${availableGap}min < ${requiredWindow}min required)`;
  } else if (driveTimeFrom > hardCap || driveTimeTo > hardCap) {
    viable = false;
    reason = `Drive time exceeds hard cap (${hardCap}min)`;
  } else if (driveTimeFrom > longThreshold || driveTimeTo > longThreshold) {
    usesLongDrive = true;
    reason = 'VIABLE - Uses long drive allowance';
  }

  // Add source info to reason
  if (usedDirectionsApi) {
    reason += ' [Road-based times]';
  } else {
    reason += ' [Estimated times]';
  }

  return {
    gap_id: request.gap_id,
    viable,
    reason,
    required_window_mins: requiredWindow,
    available_gap_mins: availableGap,
    drive_time_from: driveTimeFrom,
    drive_time_to: driveTimeTo,
    uses_long_drive: usesLongDrive,
    used_directions_api: usedDirectionsApi,
  };
}

export async function checkViabilityBulk(
  leadPostcode: string,
  surveyorId: string
): Promise<BulkViabilityResult[]> {
  const gaps = await getGaps(surveyorId);
  const results: BulkViabilityResult[] = [];

  for (const gap of gaps) {
    if (gap.gap_type !== 'BLOCKED') {
      const result = await checkViability(
        { lead_postcode: leadPostcode, gap_id: gap.id },
        gaps
      );
      results.push({ ...result, gap });
    }
  }

  return results;
}
