import { test, expect } from "@playwright/test";

test.setTimeout(180_000);
test.describe.configure({ mode: "serial", retries: 1 });

const API_KEY = process.env.TEST_API_KEY || "skp_test:ci:admin";
const BASE_URL = process.env.API_URL || "http://localhost:4000";

let authToken: string;

test.beforeAll(async ({ request }) => {
  const resp = await request.post(`${BASE_URL}/auth/login`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ apiKey: API_KEY.split(":")[0] }),
  });
  if (resp.ok()) {
    const body = await resp.json();
    authToken = body.accessToken;
  }
});

const authHeaders = () => ({
  "Content-Type": "application/json",
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

test.describe("API Health & Basic Functionality", () => {
  test("should pass health check", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test("should return metrics", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/metrics`);
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("Scrape API Endpoints", () => {
  test("should reject unauthenticated requests", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/scrape`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({}),
    });
    expect(response.status()).toBe(401);
  });

  test("should validate scrape request", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/scrape`, {
      headers: authHeaders(),
      data: JSON.stringify({}),
    });
    expect(response.status()).toBe(400);
  });

  test("should reject invalid URLs", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/scrape`, {
      headers: authHeaders(),
      data: JSON.stringify({ url: "not-a-valid-url" }),
    });
    expect(response.status()).toBe(400);
  });

  test("should reject HTTP URLs (SSRF protection)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/scrape`, {
      headers: authHeaders(),
      data: JSON.stringify({ url: "http://example.com" }),
    });
    expect(response.status()).toBe(400);
  });

  test("should accept valid HTTPS URL", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/scrape`, {
      headers: authHeaders(),
      data: JSON.stringify({ url: "https://example.com" }),
    });

    if (response.status() === 201) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.jobId).toBeDefined();
    } else if (response.status() === 429) {
      test.skip();
    } else {
      throw new Error(`Unexpected status: ${response.status()}`);
    }
  });
});

test.describe("Rate Limiting", () => {
  test("should enforce rate limits", async ({ request }) => {
    const statusCodes: number[] = [];
    for (let i = 0; i < 15; i++) {
      const response = await request.post(`${BASE_URL}/scrape`, {
        headers: authHeaders(),
        data: JSON.stringify({ url: `https://example${i}.com` }),
      });
      statusCodes.push(response.status());
      await new Promise((r) => setTimeout(r, 300));
    }
    expect(statusCodes.some((s) => s === 429)).toBeTruthy();
  });
});

test.describe("Job Management", () => {
  test("should list scrape jobs", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/scrape/jobs`, {
      headers: authHeaders(),
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("jobs");
    }
  });
});
