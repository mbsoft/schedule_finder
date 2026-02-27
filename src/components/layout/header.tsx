'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  hasApiKey: boolean;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Schedule Dashboard',
  gaps: 'Gap Finder',
  viability: 'Viability Check',
  preferences: 'Preference Filter',
  config: 'Configuration',
};

export function Header({ activeTab, hasApiKey }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-[#27272a] h-16 flex items-center px-6 justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold uppercase tracking-tight">
          {TAB_TITLES[activeTab] ?? ''}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`flex items-center gap-2 text-sm ${
            hasApiKey ? 'text-[#d4f64d]' : 'text-[#a1a1aa]'
          }`}
        >
          {hasApiKey ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {hasApiKey ? 'API Connected' : 'No API Key'}
        </span>
      </div>
    </header>
  );
}
