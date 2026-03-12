import { Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { processJob } from './processor';
import { logger } from './logger';

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Concurrency from environment
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

// Create worker
const worker = new Worker('scrape', processJob, {
  connection,
  concurrency: CONCURRENCY,
  limiter: {
    max: Number(process.env.RATE_LIMIT_MAX) || 50,
    duration: Number(process.env.RATE_LIMIT_DURATION) || 60000, // 50 jobs per minute
  },
  settings: {
    stalledInterval: 30000,
    maxStalledCount: 2,
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('scrape', { connection: connection.duplicate() });

// Worker event handlers
worker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} completed`, {
    jobId: job.id,
    returnvalue: job.returnvalue,
  });
});

worker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} failed: ${err.message}`, {
    jobId: job?.id,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

worker.on('stalled', (jobId) => {
  logger.warn(`⚠️ Job ${jobId} stalled`, { jobId });
});

worker.on('error', (err) => {
  logger.error(`Worker error: ${err.message}`, { error: err.message });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down worker...');
  await worker.close();
  await queueEvents.close();
  await connection.quit();
  logger.info('Worker shut down gracefully');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`🔧 Worker started with concurrency=${CONCURRENCY}`);
logger.info(`📡 Connected to Redis at ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
