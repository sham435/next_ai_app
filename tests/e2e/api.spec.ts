import { test, expect } from '@playwright/test';

// Use Railway environment variable if available
const API_URL = process.env.API_URL || process.env.RAILWAY_SERVICE_SCRAPER_URL || 'http://localhost:4000';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

// Increase default test timeout for slow scraper responses
test.setTimeout(180_000); // 3 minutes per test

// -------------------------
// Health & Metrics
// -------------------------
test.describe('API Health & Basic Functionality', () => {
  test('should pass health check', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test('should return metrics', async ({ request }) => {
    const response = await request.get(`${API_URL}/metrics`);
    expect(response.ok()).toBeTruthy();
  });
});

// -------------------------
// Scrape API Endpoints
// -------------------------
test.describe('Scrape API Endpoints', () => {
  test('should validate scrape request', async ({ request }) => {
    const response = await request.post(`${API_URL}/scrape`, { data: {} });
    expect(response.status()).toBe(400);
  });

  test('should reject invalid URLs', async ({ request }) => {
    const response = await request.post(`${API_URL}/scrape`, {
      data: { url: 'not-a-valid-url' },
    });
    expect(response.status()).toBe(400);
  });

  test('should reject HTTP URLs (SSRF protection)', async ({ request }) => {
    const response = await request.post(`${API_URL}/scrape`, {
      data: { url: 'http://example.com' },
    });
    expect(response.status()).toBe(400);
  });

  test('should accept valid HTTPS URL', async ({ request }) => {
    const response = await request.post(`${API_URL}/scrape`, {
      data: { url: 'https://example.com' },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.jobId).toBeDefined();
  });
});

// -------------------------
// Rate Limiting
// -------------------------
test.describe('Rate Limiting', () => {
  test('should enforce rate limits', async ({ request }) => {
    const responses = [];

    // Throttle requests to avoid CI overload
    for (let i = 0; i < 15; i++) {
      const res = await request.post(`${API_URL}/scrape`, {
        data: { url: `https://example${i}.com` },
      });
      responses.push(res);

      // Small pause between requests to reduce concurrency spikes
      await new Promise(r => setTimeout(r, 300));
    }

    const statusCodes = responses.map(r => r.status());
    expect(statusCodes.some(s => s === 429)).toBeTruthy();
  });
});
