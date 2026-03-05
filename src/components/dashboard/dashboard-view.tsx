'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Map as MapIcon,
} from 'lucide-react';
import type { DashboardStats, ScheduleEntry, Gap } from '@/types';
import { StatCard } from '@/components/dashboard/stat-card';
import { Timeline } from '@/components/dashboard/timeline';
import { RouteMap } from '@/components/dashboard/route-map';

interface DashboardViewProps {
  stats: DashboardStats;
  schedule: ScheduleEntry[];
  gaps: Gap[];
  onRefresh: () => void;
  loading: boolean;
  hasApiKey: boolean;
}

export function DashboardView({
  stats,
  schedule,
  gaps,
  onRefresh,
  loading,
  hasApiKey,
}: DashboardViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get unique dates from schedule
  const dates = [...new Set(schedule.map((s) => s.date))].sort();

  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  return (
    <div className="space-y-6 animate-slide-in" data-testid="dashboard-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DASHBOARD</h2>
          <p className="text-sm text-[#a1a1aa]">Josh&apos;s Schedule Overview</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          data-testid="refresh-btn"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard value={stats.total_jobs || 0} label="Total Jobs" icon={Calendar} />
        <StatCard
          value={stats.total_gaps || 0}
          label="Available Gaps"
          icon={Target}
          color="#00f0ff"
        />
        <StatCard
          value={stats.strong_gaps || 0}
          label="Strong Slots"
          icon={CheckCircle}
          color="#d4f64d"
        />
        <StatCard
          value={stats.tight_gaps || 0}
          label="Tight Slots"
          icon={AlertTriangle}
          color="#fbbf24"
        />
      </div>

      {/* Timeline Section */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">SCHEDULE TIMELINE</h3>
          </div>
          <div className="flex gap-2">
            {dates.slice(0, 7).map((date) => (
              <button
                key={date}
                className={`px-3 py-1 text-xs rounded ${
                  selectedDate === date
                    ? 'bg-[#d4f64d] text-black'
                    : 'bg-[#27272a] text-[#a1a1aa] hover:text-white'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                {new Date(date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {selectedDate && (
            <Timeline schedule={schedule} gaps={gaps} date={selectedDate} />
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#27272a]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff453a]/30 border border-[#ff453a]/50" />
              <span className="text-xs text-[#a1a1aa]">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#d4f64d]/20 border border-[#d4f64d]/40" />
              <span className="text-xs text-[#a1a1aa]">Strong Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#fbbf24]/20 border border-[#fbbf24]/40" />
              <span className="text-xs text-[#a1a1aa]">Tight Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#a1a1aa]/20 border border-[#a1a1aa]/40" />
              <span className="text-xs text-[#a1a1aa]">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded bg-[#00f0ff]" />
              <span className="text-xs text-[#a1a1aa]">Current Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Route Map */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <MapIcon size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">ROUTE MAP</h3>
          </div>
        </div>
        <div className="card-body">
          <RouteMap
            surveyorId="josh-001"
            date={selectedDate}
            hasApiKey={hasApiKey}
          />
        </div>
      </div>

      {/* Jobs by Day Chart */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">JOBS BY DAY</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-end gap-4 h-32">
            {Object.entries(stats.jobs_by_day || {}).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-[#d4f64d]/20 rounded-t border border-[#d4f64d]/30"
                  style={{
                    height: `${(count / 5) * 100}%`,
                    minHeight: count > 0 ? '20px' : '4px',
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-t from-[#d4f64d]/40 to-transparent" />
                </div>
                <span className="text-xs text-[#a1a1aa]">{day.slice(0, 3)}</span>
                <span className="text-sm font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
