'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  MapPin,
  Search,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { Gap, BulkViabilityResult } from '@/types';
import { apiPost } from '@/lib/api-client';
import { StatCard } from '@/components/dashboard/stat-card';

interface ViabilityCheckViewProps {
  gaps: Gap[];
  hasApiKey: boolean;
}

export function ViabilityCheckView({ gaps, hasApiKey }: ViabilityCheckViewProps) {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkViabilityResult[]>([]);

  const handleCheck = async () => {
    if (!postcode.trim()) {
      toast.error('Please enter a lead postcode');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost<BulkViabilityResult[]>(
        '/viability-check-bulk',
        null,
        { lead_postcode: postcode, surveyor_id: 'josh-001' }
      );
      setResults(data);
      toast.success(`Checked ${data.length} gaps`);
    } catch (error) {
      toast.error('Failed to check viability');
      console.error(error);
    }
    setLoading(false);
  };

  const viableCount = results.filter((r) => r.viable).length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="viability-check-view">
      <div>
        <h2 className="text-2xl font-bold">VIABILITY CHECK</h2>
        <p className="text-sm text-[#a1a1aa]">
          Layer 2 - Validate Slots Against Drive Times
        </p>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">LEAD POSTCODE</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                className="form-input"
                placeholder="Enter UK postcode (e.g., B15 2TT)"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                data-testid="postcode-input"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCheck}
              disabled={loading || !postcode.trim()}
              data-testid="check-viability-btn"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Check Viability
            </button>
          </div>

          {!hasApiKey && (
            <div className="mt-4 p-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-lg flex items-center gap-3">
              <AlertTriangle size={18} className="text-[#fbbf24]" />
              <p className="text-sm text-[#fbbf24]">
                NextBillion API key not configured. Using estimated drive times.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              value={results.length}
              label="Slots Checked"
              icon={Target}
              color="#00f0ff"
            />
            <StatCard
              value={viableCount}
              label="Viable Slots"
              icon={CheckCircle}
              color="#d4f64d"
            />
            <StatCard
              value={results.length - viableCount}
              label="Rejected"
              icon={XCircle}
              color="#ff453a"
            />
            <StatCard
              value={
                results.filter((r) => r.used_directions_api).length > 0
                  ? 'Road'
                  : 'Est'
              }
              label="Drive Time Source"
              icon={MapPin}
              color={
                results.filter((r) => r.used_directions_api).length > 0
                  ? '#d4f64d'
                  : '#fbbf24'
              }
            />
          </div>

          {results.some((r) => r.used_directions_api) && (
            <div className="p-3 bg-[#d4f64d]/10 border border-[#d4f64d]/30 rounded-lg flex items-center gap-3">
              <CheckCircle size={18} className="text-[#d4f64d]" />
              <p className="text-sm text-[#d4f64d]">
                Using real road-based drive times from NextBillion Directions API
              </p>
            </div>
          )}

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold">VIABILITY RESULTS FOR {postcode}</h3>
              <span className="text-xs text-[#a1a1aa]">
                {results.some((r) => r.used_directions_api)
                  ? 'Road-based times'
                  : 'Estimated times'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                className="data-table"
                data-testid="viability-results-table"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Window</th>
                    <th>Available</th>
                    <th>Required</th>
                    <th>Drive From</th>
                    <th>Drive To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx}>
                      <td className="font-mono">{result.gap?.date}</td>
                      <td className="font-mono">
                        {result.gap?.gap_start} - {result.gap?.gap_end}
                      </td>
                      <td className="font-mono">
                        {result.available_gap_mins} min
                      </td>
                      <td className="font-mono">
                        {result.required_window_mins} min
                      </td>
                      <td className="font-mono">
                        {result.drive_time_from || '\u2014'} min
                        {result.used_directions_api && (
                          <span className="ml-1 text-[#d4f64d]">*</span>
                        )}
                      </td>
                      <td className="font-mono">
                        {result.drive_time_to || '\u2014'} min
                        {result.used_directions_api && (
                          <span className="ml-1 text-[#d4f64d]">*</span>
                        )}
                      </td>
                      <td>
                        {result.viable ? (
                          <span className="badge badge-success">
                            {result.uses_long_drive
                              ? 'VIABLE (Long Drive)'
                              : 'VIABLE'}
                          </span>
                        ) : (
                          <span className="badge badge-error">REJECT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
