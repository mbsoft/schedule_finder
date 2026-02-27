'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Key, Settings, Loader2 } from 'lucide-react';
import type { Config } from '@/types';

interface ConfigurationViewProps {
  config: Config;
  onSave: (config: Config) => Promise<void>;
  hasApiKey: boolean;
  onSaveApiKey: (key: string) => Promise<void>;
}

export function ConfigurationView({
  config,
  onSave,
  hasApiKey,
  onSaveApiKey,
}: ConfigurationViewProps) {
  const [localConfig, setLocalConfig] = useState<Config>(config);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(localConfig);
    setSaving(false);
    toast.success('Configuration saved');
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    await onSaveApiKey(apiKey);
    setApiKey('');
    toast.success('API key saved');
  };

  const updateConfig = (key: keyof Config, value: string | number | boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-slide-in" data-testid="configuration-view">
      <div>
        <h2 className="text-2xl font-bold">CONFIGURATION</h2>
        <p className="text-sm text-[#a1a1aa]">
          Master Settings for the Slot Engine
        </p>
      </div>

      {/* API Key Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Key size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">NEXTBILLION API KEY</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="password"
                className="form-input"
                placeholder={
                  hasApiKey
                    ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                    : 'Enter your NextBillion API key'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="api-key-input"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSaveApiKey}
              data-testid="save-api-key-btn"
            >
              <Key size={16} />
              {hasApiKey ? 'Update Key' : 'Save Key'}
            </button>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-2">
            {hasApiKey
              ? 'API key configured - geocoding and drive times enabled'
              : 'No API key configured - using estimated drive times'}
          </p>
        </div>
      </div>

      {/* Franchise Operations */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">A &mdash; FRANCHISE OPERATIONS</h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Survey Duration (mins)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.survey_duration_mins || 90}
              onChange={(e) =>
                updateConfig('survey_duration_mins', parseInt(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Working Hours Start</label>
            <input
              type="time"
              className="form-input"
              value={localConfig.working_hours_start || '08:00'}
              onChange={(e) =>
                updateConfig('working_hours_start', e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Working Hours End</label>
            <input
              type="time"
              className="form-input"
              value={localConfig.working_hours_end || '18:00'}
              onChange={(e) =>
                updateConfig('working_hours_end', e.target.value)
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Booking Window (days)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.booking_window_days || 14}
              onChange={(e) =>
                updateConfig('booking_window_days', parseInt(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Buffer Each Side (mins)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.buffer_mins_each_side || 15}
              onChange={(e) =>
                updateConfig('buffer_mins_each_side', parseInt(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Long Drives/Day</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.max_long_drives_per_day || 1}
              onChange={(e) =>
                updateConfig('max_long_drives_per_day', parseInt(e.target.value))
              }
            />
          </div>
        </div>
      </div>

      {/* Distance-Based Gaps */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">
            B &mdash; DISTANCE-BASED MINIMUM GAPS
          </h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Long Drive Threshold (mins)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.long_drive_threshold_mins || 45}
              onChange={(e) =>
                updateConfig(
                  'long_drive_threshold_mins',
                  parseInt(e.target.value)
                )
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Drive Time Cap (mins)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.max_drive_time_hard_cap_mins || 75}
              onChange={(e) =>
                updateConfig(
                  'max_drive_time_hard_cap_mins',
                  parseInt(e.target.value)
                )
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Drive Time Safety Multiplier</label>
            <input
              type="number"
              step="0.05"
              className="form-input"
              value={localConfig.drive_time_safety_mult || 1.15}
              onChange={(e) =>
                updateConfig(
                  'drive_time_safety_mult',
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Territory Rules */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">C &mdash; TERRITORY RULES</h3>
        </div>
        <div className="card-body grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Dense Day Threshold</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.dense_day_threshold || 4}
              onChange={(e) =>
                updateConfig('dense_day_threshold', parseInt(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sparse Day Threshold</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.sparse_day_threshold || 2}
              onChange={(e) =>
                updateConfig('sparse_day_threshold', parseInt(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Dense Day Min Gap (mins)</label>
            <input
              type="number"
              className="form-input"
              value={localConfig.dense_day_min_gap_mins || 150}
              onChange={(e) =>
                updateConfig(
                  'dense_day_min_gap_mins',
                  parseInt(e.target.value)
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-16">
        <button
          className="btn btn-primary relative z-50"
          onClick={handleSave}
          disabled={saving}
          data-testid="save-config-btn"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Settings size={16} />
          )}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
