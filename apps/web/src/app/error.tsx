'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Something went wrong</h2>
        <p className="text-gray-400">{error.message}</p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
