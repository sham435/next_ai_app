'use client';

import type { ScrapeStatus } from '@/hooks/useScrape';

const statusConfig: Record<ScrapeStatus, { label: string; color: string }> = {
  idle: { label: 'Ready', color: 'bg-gray-700 text-gray-300' },
  connecting: { label: 'Connecting', color: 'bg-yellow-900/50 text-yellow-400' },
  scraping: { label: 'Scraping', color: 'bg-blue-900/50 text-blue-400' },
  complete: { label: 'Complete', color: 'bg-green-900/50 text-green-400' },
  error: { label: 'Failed', color: 'bg-red-900/50 text-red-400' },
};

export function StatusBadge({ status }: { status: ScrapeStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
