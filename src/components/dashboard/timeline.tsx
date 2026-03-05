'use client';

import { useState } from 'react';
import type { ScheduleEntry, Gap } from '@/types';

interface TimelineProps {
  schedule: ScheduleEntry[];
  gaps: Gap[];
  date: string;
  onGapClick?: (gap: Gap) => void;
}

interface TooltipData {
  content: React.ReactNode;
  x: number;
  y: number;
}

export function Timeline({ schedule, gaps, date, onGapClick }: TimelineProps) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 to 18:00
  const totalMinutes = 10 * 60; // 10 hours in minutes
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

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

  const showTooltip = (e: React.MouseEvent, content: React.ReactNode) => {
    setTooltip({ content, x: e.clientX, y: e.clientY });
  };

  const hideTooltip = () => setTooltip(null);

  const daySchedule = schedule.filter((s) => s.date === date);
  const dayGaps = gaps.filter((g) => g.date === date);

  // Current time indicator - only show for today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimePos =
    date === todayStr && currentHour >= 8 && currentHour < 18
      ? getPosition(`${currentHour}:${currentMin.toString().padStart(2, '0')}`)
      : null;

  const renderScheduleTooltip = (entry: ScheduleEntry) => (
    <div className="space-y-1">
      <div className="font-bold text-[#fafafa]">
        {entry.job_type === 'BLOCK' ? 'BLOCKED' : entry.job_type}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#a1a1aa]">Time</span>
        <span className="font-mono">{entry.start_time} – {entry.end_time}</span>
      </div>
      {entry.postcode && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">Postcode</span>
          <span className="font-mono">{entry.postcode}</span>
        </div>
      )}
      {entry.area && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">Area</span>
          <span>{entry.area}</span>
        </div>
      )}
      {entry.notes && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">Notes</span>
          <span>{entry.notes}</span>
        </div>
      )}
    </div>
  );

  const renderGapTooltip = (gap: Gap) => (
    <div className="space-y-1">
      <div className="font-bold text-[#fafafa]">
        {gap.gap_type === 'STRONG' ? 'STRONG GAP' : 'TIGHT GAP'}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#a1a1aa]">Window</span>
        <span className="font-mono">{gap.gap_start} – {gap.gap_end}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#a1a1aa]">Duration</span>
        <span className="font-mono">{gap.gap_mins} min</span>
      </div>
      {gap.from_postcode && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">From</span>
          <span className="font-mono">{gap.from_postcode}</span>
        </div>
      )}
      {gap.to_postcode && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">To</span>
          <span className="font-mono">{gap.to_postcode}</span>
        </div>
      )}
      {gap.classification && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">Class</span>
          <span>{gap.classification}</span>
        </div>
      )}
      {gap.notes && (
        <div className="flex justify-between gap-4">
          <span className="text-[#a1a1aa]">Notes</span>
          <span>{gap.notes}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="timeline-container" data-testid="timeline">
      <div className="timeline-header">
        {hours.map((hour) => (
          <div
            key={hour}
            className="timeline-hour"
            style={{ left: `${((hour - 8) / 10) * 100}%` }}
          >
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
            onMouseEnter={(e) => showTooltip(e, renderScheduleTooltip(entry))}
            onMouseMove={(e) => showTooltip(e, renderScheduleTooltip(entry))}
            onMouseLeave={hideTooltip}
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
            onMouseEnter={(e) => showTooltip(e, renderGapTooltip(gap))}
            onMouseMove={(e) => showTooltip(e, renderGapTooltip(gap))}
            onMouseLeave={hideTooltip}
          >
            <span className="truncate text-xs">{gap.gap_mins}min</span>
          </div>
        ))}
      </div>

      {/* Tooltip rendered outside the row to avoid overflow clipping */}
      {tooltip && (
        <div
          className="timeline-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
