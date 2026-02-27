'use client';

import type { ScheduleEntry, Gap } from '@/types';

interface TimelineProps {
  schedule: ScheduleEntry[];
  gaps: Gap[];
  date: string;
  onGapClick?: (gap: Gap) => void;
}

export function Timeline({ schedule, gaps, date, onGapClick }: TimelineProps) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 to 18:00
  const totalMinutes = 10 * 60; // 10 hours in minutes

  const getPosition = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    const minutesFromStart = (h - 8) * 60 + m;
    return (minutesFromStart / totalMinutes) * 100;
  };

  const getWidth = (start: string, end: string): number => {
    const startPos = getPosition(start);
    const endPos = getPosition(end);
    return endPos - startPos;
  };

  const daySchedule = schedule.filter((s) => s.date === date);
  const dayGaps = gaps.filter((g) => g.date === date);

  // Current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimePos =
    currentHour >= 8 && currentHour < 18
      ? getPosition(`${currentHour}:${currentMin.toString().padStart(2, '0')}`)
      : null;

  return (
    <div className="timeline-container" data-testid="timeline">
      <div className="timeline-header">
        {hours.map((hour) => (
          <div key={hour} className="timeline-hour">
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      <div className="timeline-row relative">
        {/* Time grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute top-0 bottom-0 w-px bg-[#27272a]"
            style={{ left: `${((hour - 8) / 10) * 100}%` }}
          />
        ))}

        {/* Current time indicator */}
        {currentTimePos !== null && (
          <div
            className="current-time-indicator"
            style={{ left: `${currentTimePos}%` }}
          />
        )}

        {/* Schedule entries */}
        {daySchedule.map((entry, idx) => (
          <div
            key={idx}
            className={`timeline-slot ${entry.job_type === 'BLOCK' ? 'block' : 'busy'}`}
            style={{
              left: `${getPosition(entry.start_time)}%`,
              width: `${getWidth(entry.start_time, entry.end_time)}%`,
            }}
            title={`${entry.start_time}-${entry.end_time}: ${entry.area || entry.postcode}`}
          >
            <span className="truncate text-xs">
              {entry.job_type === 'BLOCK' ? 'BLOCKED' : entry.area || entry.postcode}
            </span>
          </div>
        ))}

        {/* Gap indicators */}
        {dayGaps.map((gap, idx) => (
          <div
            key={`gap-${idx}`}
            className={`timeline-slot ${gap.gap_type === 'STRONG' ? 'gap-strong' : 'gap-tight'}`}
            style={{
              left: `${getPosition(gap.gap_start)}%`,
              width: `${getWidth(gap.gap_start, gap.gap_end)}%`,
            }}
            onClick={() => onGapClick?.(gap)}
            title={`Gap: ${gap.gap_start}-${gap.gap_end} (${gap.gap_mins}min)`}
          >
            <span className="truncate text-xs">{gap.gap_mins}min</span>
          </div>
        ))}
      </div>
    </div>
  );
}
