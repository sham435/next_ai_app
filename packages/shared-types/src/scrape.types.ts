/**
 * Scrape request payload
 */
export interface ScrapeRequest {
  /** URL to scrape — must be HTTPS */
  url: string;
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
