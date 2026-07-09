import { test, expect } from "@playwright/test";

test.setTimeout(180_000);
test.describe.configure({ mode: "serial", retries: 1 });

test.describe("API Health & Basic Functionality", () => {
  test("should pass health check", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test("should return metrics", async ({ request }) => {
    const response = await request.get("/metrics");
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("Scrape API Endpoints", () => {
  test("should validate scrape request", async ({ request }) => {
    const response = await request.post("/scrape", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({}),
    });
    expect(response.status()).toBe(400);
  });

  test("should reject invalid URLs", async ({ request }) => {
    const response = await request.post("/scrape", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ url: "not-a-valid-url" }),
    });
    expect(response.status()).toBe(400);
  });

  test("should reject HTTP URLs (SSRF protection)", async ({ request }) => {
    const response = await request.post("/scrape", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ url: "http://example.com" }),
    });
    expect(response.status()).toBe(400);
  });

  test("should accept valid HTTPS URL", async ({ request }) => {
    const response = await request.post("/scrape", {
      headers: { "Content-Type": "application/json" },
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
      const response = await request.post("/scrape", {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ url: `https://example${i}.com` }),
      });
      statusCodes.push(response.status());
      await new Promise((r) => setTimeout(r, 300));
    }

    expect(statusCodes.some((s) => s === 429)).toBeTruthy();
  });
});
