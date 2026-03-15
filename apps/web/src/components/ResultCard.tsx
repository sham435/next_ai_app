'use client';

import { useState } from 'react';

interface ScrapeCompleteEvent {
  jobId: string;
  url: string;
  success: boolean;
  filesFound: number;
  location: string;
  duration: number;
  error?: string;
}

export function ResultCard({ result }: { result: ScrapeCompleteEvent }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/scrape/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url }),
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `scraped-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg bg-green-900/20 border border-green-800 p-4 space-y-3">
      <h3 className="font-medium text-green-400">
        Scraping Complete
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Files Found</p>
          <p className="text-lg font-bold text-white">{result.filesFound}</p>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="text-lg font-bold text-white">{(result.duration / 1000).toFixed(1)}s</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="w-full mt-2 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {downloading ? 'Downloading ZIP...' : 'Download ZIP'}
      </button>
    </div>
  );
}
