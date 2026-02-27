'use client';

import {
  LayoutDashboard,
  Target,
  Gauge,
  Filter,
  Settings,
  Zap,
} from 'lucide-react';

type TabId = 'dashboard' | 'gaps' | 'viability' | 'preferences' | 'config';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gaps', label: 'Gap Finder', icon: Target },
    { id: 'viability', label: 'Viability Check', icon: Gauge },
    { id: 'preferences', label: 'Preference Filter', icon: Filter },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="p-6 border-b border-[#27272a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#d4f64d] flex items-center justify-center">
            <Zap size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">MTLL SLOT</h1>
            <p className="text-xs text-[#a1a1aa]">ENGINE v3</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 p-3 bg-[#27272a] rounded-lg mb-6">
          <img
            src="https://images.pexels.com/photos/3776969/pexels-photo-3776969.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100"
            alt="Josh"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-sm">Josh</p>
            <p className="text-xs text-[#a1a1aa]">Active Surveyor</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-[#d4f64d]/10 text-[#d4f64d] border border-[#d4f64d]/30'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#27272a]">
        <div className="text-xs text-[#a1a1aa] text-center">
          Powered by NextBillion API
        </div>
      </div>
    </aside>
  );
}
