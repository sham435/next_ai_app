/**
 * Scrape method types
 */
export type ScrapeMethod = 'fast' | 'auto' | 'full' | 'puppeteer' | 'selenium' | 'crawl4ai' | 'static';

/**
 * Scrape request payload
 */
export interface ScrapeRequest {
  /** URL to scrape — must be HTTPS */
  url: string;
  /** Scrape method: auto (fallback chain), fast (simple), static (HTTP), puppeteer (JS), selenium (deep JS), crawl4ai (deep crawl) */
  method?: ScrapeMethod;
}

/**
 * Scrape response payload
 */
export interface ScrapeResponse {
  success: boolean;
  jobId?: string;
  filesFound?: number;
  location?: string;
  error?: string;
  method?: ScrapeMethod;
}

/**
 * Job progress event (WebSocket)
 */
export interface ScrapeProgressEvent {
  jobId: string;
  progress: number; // 0-100
  stage: ScrapeStage;
  message?: string;
}

/**
 * Job completion event (WebSocket)
 */
export interface ScrapeCompleteEvent {
  jobId: string;
  url: string;
  success: boolean;
  filesFound: number;
  location: string;
  duration: number; // ms
  error?: string;
}

/**
 * Scrape job stages
 */
export type ScrapeStage =
  | 'queued'
  | 'fetching'
  | 'parsing'
  | 'downloading'
  | 'complete'
  | 'failed';

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  redis?: 'connected' | 'disconnected';
  queue?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

/**
 * Job priority tiers
 */
export enum JobPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}

/**
 * Queue job data shape
 */
export interface ScrapeJobData {
  url: string;
  priority: JobPriority;
  requestedAt: string;
  requestIp?: string;
  method?: ScrapeMethod;
}

/**
 * Structured API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}
