import { ScrapeForm } from '@/components/ScrapeForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            🕷️ Scrape Platform
          </h1>
          <p className="mt-2 text-gray-400">
            Enter a URL to start scraping. Only HTTPS URLs are accepted.
          </p>
        </div>
        <ScrapeForm />
      </div>
    </main>
  );
}
