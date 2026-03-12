'use client';

import type { ScrapeCompleteEvent } from '@scrape-platform/shared-types';

export function ResultCard({ result }: { result: ScrapeCompleteEvent }) {
  return (
    <div className="rounded-lg bg-green-900/20 border border-green-800 p-4 space-y-2">
      <h3 className="font-medium text-green-400">✅ Scraping Complete</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Files Found</p>
          <p className="text-lg font-bold text-white">{result.filesFound}</p>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="text-lg font-bold text-white">{(result.duration / 1000).toFixed(1)}s</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-500">Download Location</p>
          <p className="text-white font-mono text-xs break-all">{result.location}</p>
        </div>
      </div>
    </div>
  );
}
