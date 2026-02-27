import { getStorage } from './index';
import type { Config, Surveyor, ScheduleEntry, Gap, ApiKeyData } from '@/types';
import { DEFAULT_CONFIG } from '@/types';
import { randomUUID } from 'crypto';

const PATHS = {
  config: 'config.json',
  apiKeys: 'api-keys.json',
  surveyors: 'surveyors/index.json',
  schedule: 'schedule/index.json',
  gaps: (surveyorId: string) => `gaps/${surveyorId}.json`,
} as const;

// --- Config ---

export async function getConfig(): Promise<Config> {
  const storage = getStorage();
  let config = await storage.read<Config>(PATHS.config);
  if (!config) {
    config = {
      ...DEFAULT_CONFIG,
      id: randomUUID(),
      updated_at: new Date().toISOString(),
    };
    await storage.write(PATHS.config, config);
  }
  return config;
}

export async function updateConfig(updates: Partial<Config>): Promise<Config> {
  const current = await getConfig();
  const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
  await getStorage().write(PATHS.config, updated);
  return updated;
}

// --- API Keys ---

export async function getApiKey(): Promise<string | null> {
  const data = await getStorage().read<ApiKeyData>(PATHS.apiKeys);
  return data?.nextbillion_key ?? null;
}

export async function saveApiKey(key: string): Promise<void> {
  await getStorage().write(PATHS.apiKeys, { nextbillion_key: key });
}

// --- Surveyors ---

export async function getSurveyors(): Promise<Surveyor[]> {
  return (await getStorage().read<Surveyor[]>(PATHS.surveyors)) ?? [];
}

export async function getSurveyor(id: string): Promise<Surveyor | null> {
  const surveyors = await getSurveyors();
  return surveyors.find(s => s.id === id) ?? null;
}

export async function createSurveyor(surveyor: Surveyor): Promise<Surveyor> {
  const surveyors = await getSurveyors();
  surveyors.push(surveyor);
  await getStorage().write(PATHS.surveyors, surveyors);
  return surveyor;
}

export async function updateSurveyor(id: string, updates: Partial<Surveyor>): Promise<Surveyor | null> {
  const surveyors = await getSurveyors();
  const idx = surveyors.findIndex(s => s.id === id);
  if (idx === -1) return null;
  surveyors[idx] = { ...surveyors[idx], ...updates };
  await getStorage().write(PATHS.surveyors, surveyors);
  return surveyors[idx];
}

// --- Schedule ---

export async function getSchedule(surveyorId?: string, date?: string): Promise<ScheduleEntry[]> {
  let entries = (await getStorage().read<ScheduleEntry[]>(PATHS.schedule)) ?? [];
  if (surveyorId) entries = entries.filter(e => e.surveyor_id === surveyorId);
  if (date) entries = entries.filter(e => e.date === date);
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

export async function createScheduleEntry(entry: ScheduleEntry): Promise<ScheduleEntry> {
  const entries = (await getStorage().read<ScheduleEntry[]>(PATHS.schedule)) ?? [];
  entries.push(entry);
  await getStorage().write(PATHS.schedule, entries);
  return entry;
}

export async function deleteScheduleEntry(id: string): Promise<boolean> {
  const entries = (await getStorage().read<ScheduleEntry[]>(PATHS.schedule)) ?? [];
  const filtered = entries.filter(e => e.id !== id);
  if (filtered.length === entries.length) return false;
  await getStorage().write(PATHS.schedule, filtered);
  return true;
}

// --- Gaps ---

export async function getGaps(surveyorId: string): Promise<Gap[]> {
  return (await getStorage().read<Gap[]>(PATHS.gaps(surveyorId))) ?? [];
}

export async function saveGaps(surveyorId: string, gaps: Gap[]): Promise<void> {
  await getStorage().write(PATHS.gaps(surveyorId), gaps);
}

// --- Bulk Operations ---

export async function clearAllData(): Promise<void> {
  const storage = getStorage();
  await storage.delete(PATHS.config);
  await storage.delete(PATHS.apiKeys);
  await storage.delete(PATHS.surveyors);
  await storage.delete(PATHS.schedule);
}

export async function saveSurveyors(surveyors: Surveyor[]): Promise<void> {
  await getStorage().write(PATHS.surveyors, surveyors);
}

export async function saveScheduleEntries(entries: ScheduleEntry[]): Promise<void> {
  await getStorage().write(PATHS.schedule, entries);
}
