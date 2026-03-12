'use client';

import { useState, FormEvent } from 'react';
import { ScrapeRequestSchema } from '@scrape-platform/shared-types';
import { useScrape } from '@/hooks/useScrape';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { ResultCard } from './ResultCard';

export function ScrapeForm() {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const scrape = useScrape();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const result = ScrapeRequestSchema.safeParse({ url });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message || 'Invalid URL');
      return;
    }

    scrape.start(url);
  };

  const handleReset = () => {
    setUrl('');
    setValidationError(null);
    scrape.reset();
  };

  const isProcessing = scrape.status === 'connecting' || scrape.status === 'scraping';

  return (
    <div className="space-y-6">
      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
            Target URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError(null);
            }}
            placeholder="https://example.com"
            disabled={isProcessing}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-colors"
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-400">{validationError}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isProcessing || !url}
            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? '⏳ Scraping...' : '🚀 Start Scraping'}
          </button>

          {(scrape.status === 'complete' || scrape.status === 'error') && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-600 px-6 py-3 font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              🔄 Retry
            </button>
          )}
        </div>
      </form>

      {/* Status Display */}
      {scrape.status !== 'idle' && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={scrape.status} />
            {scrape.stage && (
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {scrape.stage}
              </span>
            )}
          </div>

          {isProcessing && (
            <ProgressBar progress={scrape.progress} />
          )}

          {scrape.message && (
            <p className="text-sm text-gray-400">{scrape.message}</p>
          )}

          {scrape.status === 'complete' && scrape.result && (
            <ResultCard result={scrape.result} />
          )}

          {scrape.status === 'error' && scrape.error && (
            <div className="rounded-lg bg-red-900/20 border border-red-800 p-4">
              <p className="text-sm text-red-400">❌ {scrape.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
