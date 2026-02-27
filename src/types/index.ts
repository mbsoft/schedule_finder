export interface Config {
  id: string;
  survey_duration_mins: number;
  working_hours_start: string;
  working_hours_end: string;
  booking_window_days: number;
  min_lead_time_same_day_mins: number;
  buffer_mins_each_side: number;
  max_long_drives_per_day: number;
  long_drive_threshold_mins: number;
  max_drive_time_hard_cap_mins: number;
  weekends_available: boolean;
  max_slots_per_day_insert: number;
  min_gap_nearby_mins: number;
  min_gap_medium_mins: number;
  min_gap_long_mins: number;
  nearby_miles_threshold: number;
  medium_miles_threshold: number;
  long_miles_threshold: number;
  dense_day_threshold: number;
  sparse_day_threshold: number;
  dense_day_min_gap_mins: number;
  drive_time_safety_mult: number;
  preference_match_weight: number;
  sparse_day_priority_boost: number;
  min_conversion_gap_mins: number;
  updated_at: string | null;
}

export interface Surveyor {
  id: string;
  name: string;
  home_postcode: string;
  home_lat: number | null;
  home_lng: number | null;
  working_days: string[];
  territory_postcodes: string[];
  max_jobs_per_day: number;
  active: boolean;
}

export interface ScheduleEntry {
  id: string;
  surveyor_id: string;
  date: string;
  day_name: string;
  start_time: string;
  end_time: string;
  postcode: string;
  job_type: string;
  area: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Gap {
  id: string;
  surveyor_id?: string;
  date: string;
  day_name: string;
  gap_start: string;
  gap_end: string;
  gap_mins: number;
  from_postcode: string | null;
  to_postcode: string | null;
  gap_type: 'STRONG' | 'TIGHT' | 'BLOCKED';
  classification: string;
  notes: string | null;
}

export interface ViabilityCheckRequest {
  lead_postcode: string;
  gap_id: string;
}

export interface ViabilityResult {
  gap_id: string;
  viable: boolean;
  reason: string;
  required_window_mins: number;
  available_gap_mins: number;
  drive_time_from: number | null;
  drive_time_to: number | null;
  uses_long_drive: boolean;
  used_directions_api: boolean;
}

export interface BulkViabilityResult extends ViabilityResult {
  gap: Gap;
}

export interface PreferenceFilterRequest {
  preferred_day: string | null;
  time_of_day: string | null;
  specific_date: string | null;
}

export interface SlotOffer {
  gap_id: string;
  date: string;
  day_name: string;
  slot_start: string;
  slot_end: string;
  preference_match: boolean;
  rank: number;
  area: string | null;
}

export interface GeocodeRequest {
  postcode: string;
  country?: string;
}

export interface GeocodeResult {
  postcode: string;
  lat: number | null;
  lng: number | null;
  success: boolean;
  error: string | null;
}

export interface DashboardStats {
  total_jobs: number;
  total_gaps: number;
  strong_gaps: number;
  tight_gaps: number;
  jobs_by_day: Record<string, number>;
  dense_days: string[];
  sparse_days: string[];
  booking_window_days: number;
  config: Config;
}

export interface ApiKeyData {
  nextbillion_key: string;
}

export const DEFAULT_CONFIG: Omit<Config, 'id' | 'updated_at'> = {
  survey_duration_mins: 90,
  working_hours_start: "08:00",
  working_hours_end: "18:00",
  booking_window_days: 14,
  min_lead_time_same_day_mins: 120,
  buffer_mins_each_side: 15,
  max_long_drives_per_day: 1,
  long_drive_threshold_mins: 45,
  max_drive_time_hard_cap_mins: 75,
  weekends_available: false,
  max_slots_per_day_insert: 3,
  min_gap_nearby_mins: 120,
  min_gap_medium_mins: 135,
  min_gap_long_mins: 150,
  nearby_miles_threshold: 10.0,
  medium_miles_threshold: 20.0,
  long_miles_threshold: 30.0,
  dense_day_threshold: 4,
  sparse_day_threshold: 2,
  dense_day_min_gap_mins: 150,
  drive_time_safety_mult: 1.15,
  preference_match_weight: 1.2,
  sparse_day_priority_boost: 1.1,
  min_conversion_gap_mins: 90,
};
