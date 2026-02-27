'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Filter,
  CheckCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { Gap, SlotOffer, PreferenceFilterRequest } from '@/types';
import { apiPost } from '@/lib/api-client';
import { StatCard } from '@/components/dashboard/stat-card';

interface PreferenceFilterViewProps {
  gaps: Gap[];
}

export function PreferenceFilterView({ gaps }: PreferenceFilterViewProps) {
  const [preferences, setPreferences] = useState<PreferenceFilterRequest>({
    preferred_day: '',
    time_of_day: '',
    specific_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<SlotOffer[]>([]);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const data = await apiPost<SlotOffer[]>(
        '/preference-filter',
        preferences,
        { surveyor_id: 'josh-001' }
      );
      setOffers(data);
      toast.success(`Found ${data.length} slots`);
    } catch (error) {
      toast.error('Failed to filter preferences');
      console.error(error);
    }
    setLoading(false);
  };

  const matchCount = offers.filter((o) => o.preference_match).length;

  return (
    <div className="space-y-6 animate-slide-in" data-testid="preference-filter-view">
      <div>
        <h2 className="text-2xl font-bold">PREFERENCE FILTER</h2>
        <p className="text-sm text-[#a1a1aa]">
          Layer 3 - Match Slots to Customer Preferences
        </p>
      </div>

      {/* Preferences Input */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">CUSTOMER PREFERENCES</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Preferred Day</label>
              <select
                className="form-input"
                value={preferences.preferred_day ?? ''}
                onChange={(e) =>
                  setPreferences({ ...preferences, preferred_day: e.target.value })
                }
                data-testid="preferred-day-select"
              >
                <option value="">Any Day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time of Day</label>
              <select
                className="form-input"
                value={preferences.time_of_day ?? ''}
                onChange={(e) =>
                  setPreferences({ ...preferences, time_of_day: e.target.value })
                }
                data-testid="time-of-day-select"
              >
                <option value="">Any Time</option>
                <option value="morning">Morning (before 12pm)</option>
                <option value="afternoon">Afternoon (12pm - 5pm)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Specific Date</label>
              <input
                type="date"
                className="form-input"
                value={preferences.specific_date ?? ''}
                onChange={(e) =>
                  setPreferences({ ...preferences, specific_date: e.target.value })
                }
                data-testid="specific-date-input"
              />
            </div>
          </div>
          <button
            className="btn btn-primary mt-4"
            onClick={handleFilter}
            disabled={loading}
            data-testid="filter-preferences-btn"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Filter size={16} />
            )}
            Filter &amp; Rank Slots
          </button>
        </div>
      </div>

      {/* Results */}
      {offers.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              value={matchCount}
              label="Preference Matches"
              icon={CheckCircle}
              color="#d4f64d"
            />
            <StatCard
              value={offers.length - matchCount}
              label="Alternative Slots"
              icon={ChevronRight}
              color="#a1a1aa"
            />
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">RANKED SLOT OFFERS</h3>
            </div>
            <div className="overflow-x-auto">
              <table
                className="data-table"
                data-testid="preference-results-table"
              >
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Slot Time</th>
                    <th>Match</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.slice(0, 10).map((offer, idx) => (
                    <tr key={idx}>
                      <td>
                        <span
                          className={`font-mono font-bold ${
                            offer.rank <= 3 ? 'text-[#d4f64d]' : ''
                          }`}
                        >
                          #{offer.rank}
                        </span>
                      </td>
                      <td className="font-mono">{offer.date}</td>
                      <td>{offer.day_name}</td>
                      <td className="font-mono">
                        {offer.slot_start} - {offer.slot_end}
                      </td>
                      <td>
                        {offer.preference_match ? (
                          <span className="badge badge-success">MATCH</span>
                        ) : (
                          <span className="badge badge-info">ALTERNATIVE</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-secondary text-xs py-1 px-3">
                          Offer to Lead
                        </button>
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
