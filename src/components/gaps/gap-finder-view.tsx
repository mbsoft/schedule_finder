'use client';

import { useState } from 'react';
import {
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { Gap } from '@/types';

interface GapFinderViewProps {
  gaps: Gap[];
  loading: boolean;
  onRefresh: () => void;
}

export function GapFinderView({ gaps, loading, onRefresh }: GapFinderViewProps) {
  const [filterType, setFilterType] = useState('all');

  const filteredGaps = gaps.filter((g) => {
    if (filterType === 'all') return true;
    return g.gap_type === filterType.toUpperCase();
  });

  const strongCount = gaps.filter((g) => g.gap_type === 'STRONG').length;
  const tightCount = gaps.filter((g) => g.gap_type === 'TIGHT').length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="gap-finder-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GAP FINDER</h2>
          <p className="text-sm text-[#a1a1aa]">
            Layer 1 - Identify Available Slot Windows
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          data-testid="refresh-gaps-btn"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Recalculate
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="stat-card cursor-pointer"
          onClick={() => setFilterType('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#00f0ff]">{gaps.length}</div>
              <div className="stat-label">Total Gaps Found</div>
            </div>
            <Target size={24} className="text-[#00f0ff]" />
          </div>
        </div>
        <div
          className="stat-card cursor-pointer"
          onClick={() => setFilterType('strong')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#d4f64d]">{strongCount}</div>
              <div className="stat-label">Strong Opportunities</div>
            </div>
            <CheckCircle size={24} className="text-[#d4f64d]" />
          </div>
        </div>
        <div
          className="stat-card cursor-pointer"
          onClick={() => setFilterType('tight')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value text-[#fbbf24]">{tightCount}</div>
              <div className="stat-label">Tight Windows</div>
            </div>
            <AlertTriangle size={24} className="text-[#fbbf24]" />
          </div>
        </div>
      </div>

      {/* Gaps Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold">AVAILABLE GAPS</h3>
          <div className="flex gap-2">
            {['all', 'strong', 'tight'].map((type) => (
              <button
                key={type}
                className={`px-3 py-1 text-xs rounded uppercase ${
                  filterType === type
                    ? 'bg-[#d4f64d] text-black'
                    : 'bg-[#27272a] text-[#a1a1aa]'
                }`}
                onClick={() => setFilterType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table" data-testid="gaps-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Window</th>
                <th>Duration</th>
                <th>From &rarr; To</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {filteredGaps.map((gap, idx) => (
                <tr key={idx}>
                  <td className="font-mono">{gap.date}</td>
                  <td>{gap.day_name}</td>
                  <td className="font-mono">
                    {gap.gap_start} - {gap.gap_end}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        gap.gap_mins >= 180
                          ? 'badge-success'
                          : gap.gap_mins >= 120
                            ? 'badge-warning'
                            : 'badge-error'
                      }`}
                    >
                      {gap.gap_mins} min
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    {gap.from_postcode || '\u2014'} &rarr;{' '}
                    {gap.to_postcode || '\u2014'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        gap.gap_type === 'STRONG'
                          ? 'badge-success'
                          : 'badge-warning'
                      }`}
                    >
                      {gap.classification}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredGaps.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#a1a1aa] py-8">
                    No gaps found matching filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
