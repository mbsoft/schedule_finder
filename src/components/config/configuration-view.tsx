'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Key, Settings, Loader2, User, Globe } from 'lucide-react';
import type { Config, Surveyor } from '@/types';

function TimezoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [timezones, setTimezones] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    try {
      setTimezones(Intl.supportedValuesOf('timeZone'));
    } catch {
      setTimezones([
        'Africa/Cairo', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'America/New_York', 'America/Sao_Paulo', 'Asia/Kolkata', 'Asia/Shanghai',
        'Asia/Tokyo', 'Australia/Sydney', 'Europe/Berlin', 'Europe/London',
        'Europe/Moscow', 'Europe/Paris', 'Pacific/Auckland', 'UTC',
      ]);
    }
  }, []);

  return (
    <div className="max-w-sm">
      <input
        type="text"
        list="tz-list"
        className="form-input w-full"
        placeholder="Search timezone..."
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (timezones.includes(e.target.value)) {
            onChange(e.target.value);
          }
        }}
        onBlur={() => {
          if (!timezones.includes(inputValue)) {
            setInputValue(value);
          }
        }}
      />
      <datalist id="tz-list">
        {timezones.map((tz) => (
          <option key={tz} value={tz} />
        ))}
      </datalist>
    </div>
  );
}

interface ConfigurationViewProps {
  config: Config;
  onSave: (config: Config) => Promise<void>;
  hasApiKey: boolean;
  onSaveApiKey: (key: string) => Promise<void>;
  surveyor: Surveyor | null;
  onSaveSurveyor: (updates: Partial<Surveyor>) => Promise<void>;
}

export function ConfigurationView({
  config,
  onSave,
  hasApiKey,
  onSaveApiKey,
  surveyor,
  onSaveSurveyor,
}: ConfigurationViewProps) {
  const [localConfig, setLocalConfig] = useState<Config>(config);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [localSurveyor, setLocalSurveyor] = useState<Partial<Surveyor>>({});
  const [savingSurveyor, setSavingSurveyor] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (surveyor) {
      setLocalSurveyor({
        name: surveyor.name,
        home_postcode: surveyor.home_postcode,
        max_jobs_per_day: surveyor.max_jobs_per_day,
      });
    }
  }, [surveyor]);

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

  const handleSaveSurveyor = async () => {
    setSavingSurveyor(true);
    await onSaveSurveyor(localSurveyor);
    setSavingSurveyor(false);
    toast.success('Surveyor settings saved');
  };

  const updateConfig = (key: keyof Config, value: string | number | boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const isMetric = localConfig.units === 'metric';
  const distUnit = isMetric ? 'km' : 'miles';

  // Display a stored miles value in the current unit
  const displayDist = (miles: number) =>
    isMetric ? parseFloat((miles * 1.60934).toFixed(1)) : miles;

  // Parse a displayed value back to miles for storage
  const parseDist = (displayed: string) => {
    const v = parseFloat(displayed);
    return isMetric ? parseFloat((v / 1.60934).toFixed(4)) : v;
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

      {/* Surveyor Settings */}
      {surveyor && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <User size={18} className="text-[#d4f64d]" />
              <h3 className="font-semibold">SURVEYOR SETTINGS</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Surveyor Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={localSurveyor.name || ''}
                  onChange={(e) =>
                    setLocalSurveyor((prev) => ({ ...prev, name: e.target.value }))
                  }
                  data-testid="surveyor-name-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Home Postcode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. B15 2TT"
                  value={localSurveyor.home_postcode || ''}
                  onChange={(e) =>
                    setLocalSurveyor((prev) => ({
                      ...prev,
                      home_postcode: e.target.value.toUpperCase(),
                    }))
                  }
                  data-testid="surveyor-home-postcode-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Jobs / Day</label>
                <input
                  type="number"
                  className="form-input"
                  value={localSurveyor.max_jobs_per_day || 5}
                  onChange={(e) =>
                    setLocalSurveyor((prev) => ({
                      ...prev,
                      max_jobs_per_day: parseInt(e.target.value),
                    }))
                  }
                  data-testid="surveyor-max-jobs-input"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-primary"
                onClick={handleSaveSurveyor}
                disabled={savingSurveyor}
                data-testid="save-surveyor-btn"
              >
                {savingSurveyor ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <User size={16} />
                )}
                Save Surveyor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timezone & Units */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-[#d4f64d]" />
            <h3 className="font-semibold">REGIONAL SETTINGS</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="form-label">Timezone</label>
            <TimezoneInput
              value={localConfig.timezone || 'Europe/London'}
              onChange={(tz) => updateConfig('timezone', tz)}
            />
            <p className="text-xs text-[#a1a1aa] mt-1">
              All schedule dates, gap calculations, and time displays use this timezone.
            </p>
          </div>
          <div>
            <label className="form-label">Units of Measure</label>
            <div className="flex gap-2 max-w-sm">
              <button
                type="button"
                className={`flex-1 btn ${localConfig.units === 'metric' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateConfig('units', 'metric')}
              >
                Metric (km)
              </button>
              <button
                type="button"
                className={`flex-1 btn ${localConfig.units === 'imperial' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateConfig('units', 'imperial')}
              >
                Imperial (miles)
              </button>
            </div>
            <p className="text-xs text-[#a1a1aa] mt-1">
              Distances are shown in kilometres or miles throughout the app.
            </p>
          </div>
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
          <div className="form-group">
            <label className="form-label">Nearby Threshold ({distUnit})</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={displayDist(localConfig.nearby_miles_threshold || 10)}
              onChange={(e) =>
                updateConfig('nearby_miles_threshold', parseDist(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Medium Threshold ({distUnit})</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={displayDist(localConfig.medium_miles_threshold || 20)}
              onChange={(e) =>
                updateConfig('medium_miles_threshold', parseDist(e.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Long Threshold ({distUnit})</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={displayDist(localConfig.long_miles_threshold || 30)}
              onChange={(e) =>
                updateConfig('long_miles_threshold', parseDist(e.target.value))
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
