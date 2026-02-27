'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

export function StatCard({ value, label, icon: Icon, color = '#d4f64d' }: StatCardProps) {
  return (
    <div
      className="stat-card"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-value" style={{ color }}>
            {value}
          </div>
          <div className="stat-label">{label}</div>
        </div>
        {Icon && <Icon size={24} className="text-[#a1a1aa]" />}
      </div>
    </div>
  );
}
