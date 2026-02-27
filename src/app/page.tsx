'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/api-client';
import type {
  DashboardStats,
  ScheduleEntry,
  Gap,
  Config,
  ApiKeyData,
} from '@/types';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { GapFinderView } from '@/components/gaps/gap-finder-view';
import { ViabilityCheckView } from '@/components/viability/viability-check-view';
import { PreferenceFilterView } from '@/components/preferences/preference-filter-view';
import { ConfigurationView } from '@/components/config/configuration-view';

type TabId = 'dashboard' | 'gaps' | 'viability' | 'preferences' | 'config';

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({} as DashboardStats);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [config, setConfig] = useState<Config>({} as Config);
  const [hasApiKey, setHasApiKey] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [statsData, scheduleData, configData, apiKeyData] =
        await Promise.all([
          apiGet<DashboardStats>('/dashboard-stats', {
            surveyor_id: 'josh-001',
          }),
          apiGet<ScheduleEntry[]>('/schedule', { surveyor_id: 'josh-001' }),
          apiGet<Config>('/config'),
          apiGet<{ has_key: boolean }>('/api-key/status'),
        ]);

      setStats(statsData);
      setSchedule(scheduleData);
      setConfig(configData);
      setHasApiKey(apiKeyData.has_key);

      // Load gaps
      const gapsData = await apiGet<Gap[]>('/gaps', {
        surveyor_id: 'josh-001',
      });
      setGaps(gapsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
    setLoading(false);
  }, []);

  const seedData = async () => {
    setLoading(true);
    try {
      await apiPost('/seed-data');
      toast.success('Data seeded successfully');
      await loadData();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
    }
    setLoading(false);
  };

  const saveConfig = async (newConfig: Config) => {
    try {
      await apiPut('/config', newConfig);
      setConfig(newConfig);
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const saveApiKey = async (key: string) => {
    try {
      await apiPost<ApiKeyData>('/api-key', { nextbillion_key: key });
      setHasApiKey(true);
    } catch (error) {
      toast.error('Failed to save API key');
    }
  };

  const refreshGaps = async () => {
    setLoading(true);
    try {
      const gapsData = await apiGet<Gap[]>('/gaps', {
        surveyor_id: 'josh-001',
      });
      setGaps(gapsData);
      toast.success('Gaps recalculated');
    } catch (error) {
      toast.error('Failed to refresh gaps');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if data is seeded
  useEffect(() => {
    if (!loading && schedule.length === 0) {
      seedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, schedule.length]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            stats={stats}
            schedule={schedule}
            gaps={gaps}
            onRefresh={loadData}
            loading={loading}
          />
        );
      case 'gaps':
        return (
          <GapFinderView
            gaps={gaps}
            loading={loading}
            onRefresh={refreshGaps}
          />
        );
      case 'viability':
        return (
          <ViabilityCheckView gaps={gaps} hasApiKey={hasApiKey} />
        );
      case 'preferences':
        return <PreferenceFilterView gaps={gaps} />;
      case 'config':
        return (
          <ConfigurationView
            config={config}
            onSave={saveConfig}
            hasApiKey={hasApiKey}
            onSaveApiKey={saveApiKey}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="App" data-testid="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <Header activeTab={activeTab} hasApiKey={hasApiKey} />

        <div className="p-6">
          {loading && schedule.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-[#d4f64d]" />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}
