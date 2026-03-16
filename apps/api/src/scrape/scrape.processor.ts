import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ScrapeGateway } from "./scrape.gateway";
import { MetricsService } from "../metrics/metrics.service";
import type { ScrapeJobData, ScrapeStage } from "@scrape-platform/shared-types";

puppeteer.use(StealthPlugin());

@Processor("scrape")
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly gateway: ScrapeGateway,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  private async launchBrowser() {
    const chromeBin =
      process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
    const isLocal = !!process.env.CHROME_EXECUTABLE_PATH;

    const executablePath =
      chromeBin || process.env.CHROME_EXECUTABLE_PATH || "/usr/bin/chromium";

    return puppeteer.launch({
      executablePath,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--disable-gpu",
      ],
    });
  }

  private async scrapeStatic(url: string, jobId: string): Promise<string[]> {
    this.emitStage(jobId, 20, "fetching", "Fetching page content...");

    const timeout = this.config.get<number>("REQUEST_TIMEOUT", 10000);
    const response = await axios.get(url, {
      timeout,
      maxContentLength: 10 * 1024 * 1024,
      headers: {
        "User-Agent": "ScrapePlatform/1.0",
      },
    });

    this.emitStage(jobId, 50, "parsing", "Parsing HTML content...");

    const $ = cheerio.load(response.data);
    const links: string[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          links.push(
            href.startsWith("http") ? href : new URL(href, url).toString(),
          );
        } catch {
          links.push(href);
        }
      }
    });

    return links;
  }

  private async scrapeWithPuppeteer(
    url: string,
    jobId: string,
  ): Promise<{
    links: string[];
    title: string;
    nextData?: Record<string, unknown>;
    flightData?: unknown[];
  }> {
    this.emitStage(jobId, 30, "fetching", "Launching browser...");

    const browser = await this.launchBrowser();
    const links: string[] = [];
    let title = "";
    let nextData: Record<string, unknown> | undefined;
    let flightData: unknown[] | undefined;

    try {
      const page = await browser.newPage();

      // Set realistic user-agent and viewport for stealth
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      );
      await page.setViewport({ width: 1280, height: 800 });

      this.emitStage(jobId, 40, "fetching", "Loading page with JavaScript...");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      title = await page.title();

      this.emitStage(jobId, 50, "parsing", "Extracting Next.js data...");

      // Extract __NEXT_DATA__ script content
      const nextDataContent = await page.evaluate(() => {
        const script = document.getElementById("__NEXT_DATA__");
        return script ? script.textContent : null;
      });

      if (nextDataContent) {
        try {
          nextData = JSON.parse(nextDataContent);
          this.logger.log(`Found __NEXT_DATA__ for ${url}`);
        } catch (e) {
          this.logger.warn("Failed to parse __NEXT_DATA__");
        }
      }

      // Extract self.__next_f.push() flight data (React Server Components)
      const flightDataContent = await page.evaluate(() => {
        const results: string[] = [];
        const originalPush = (
          window as unknown as {
            self?: { __next_f?: { push?: (data: string[]) => unknown } };
          }
        ).self?.__next_f?.push;
        if (originalPush) {
          // The flight data is captured in the page source
          const scripts = document.querySelectorAll("script");
          scripts.forEach((script) => {
            const text = script.textContent || "";
            if (text.includes("self.__next_f.push")) {
              const matches = text.matchAll(/\((\[.*?\])\)\s*;/g);
              for (const match of matches) {
                if (match[1]) results.push(match[1]);
              }
            }
          });
        }
        return results;
      });

      if (flightDataContent.length > 0) {
        flightData = flightDataContent.map((fd: string) => {
          try {
            return JSON.parse(fd);
          } catch {
            return fd;
          }
        });
        this.logger.log(
          `Found ${flightData?.length} flight data chunks for ${url}`,
        );
      }

      this.emitStage(jobId, 60, "parsing", "Extracting links...");
      const hrefs: string[] = await page.evaluate(() => {
        const anchors = document.querySelectorAll("a[href]");
        const results: string[] = [];
        anchors.forEach((a) => {
          const el = a as HTMLAnchorElement;
          if (el.href) results.push(el.href);
        });
        return results;
      });

      links.push(
        ...hrefs.map((href) => {
          try {
            return href.startsWith("http")
              ? href
              : new URL(href, url).toString();
          } catch {
            return href;
          }
        }),
      );

      await browser.close();
    } catch (error) {
      await browser.close();
      throw error;
    }

    return { links, title, nextData, flightData };
  }

  async process(job: Job<ScrapeJobData>) {
    const { url, method } = job.data;
    const jobId = job.id as string;
    const startTime = Date.now();

    this.logger.log(
      `Processing job ${jobId}: ${url} (method: ${method || "puppeteer"})`,
    );

    try {
      // Use Puppeteer for JavaScript rendering (default)
      // Use static scraping for 'static' method
      let links: string[];
      let nextData: Record<string, unknown> | undefined;
      let flightData: unknown[] | undefined;

      if (method === "static") {
        // Simple static scraping with axios/cheerio
        links = await this.scrapeStatic(url, jobId);
      } else {
        // Puppeteer for JS rendering (puppeteer method or fallback)
        const result = await this.scrapeWithPuppeteer(url, jobId);
        links = result.links;
        nextData = result.nextData;
        flightData = result.flightData;
      }

      // Log Next.js data found
      if (nextData) {
        this.logger.log(`Extracted __NEXT_DATA__ from ${url}`);
      }
      if (flightData && flightData.length > 0) {
        this.logger.log(
          `Extracted ${flightData.length} flight data chunks from ${url}`,
        );
      }

      // Stage: Downloading
      this.emitStage(
        jobId,
        70,
        "downloading",
        `Found ${links.length} files. Preparing download...`,
      );
      await job.updateProgress(70);

      const downloadDir = path.resolve(
        this.config.get("DOWNLOAD_DIR", "./download"),
      );

      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Stage: Complete
      const duration = Date.now() - startTime;
      this.emitStage(
        jobId,
        100,
        "complete",
        `Done! Found ${links.length} files.`,
      );
      await job.updateProgress(100);

      const result = {
        jobId,
        url,
        success: true,
        filesFound: links.length,
        location: downloadDir,
        duration,
        nextData: nextData
          ? {
              props: nextData.props,
              page: nextData.page,
              buildId: nextData.buildId,
              isFallback: nextData.isFallback,
              gssp: nextData.gssp,
            }
          : undefined,
        flightDataFound: flightData ? flightData.length : 0,
      };

      this.gateway.emitComplete(jobId, result);
      this.metrics.scrapeJobsTotal.inc({ status: "completed" });
      this.metrics.scrapeJobDuration.observe(duration / 1000);

      this.logger.log(
        `Job ${jobId} completed: ${links.length} files in ${duration}ms`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);
      this.metrics.scrapeJobsTotal.inc({ status: "failed" });

      this.gateway.emitComplete(jobId, {
        jobId,
        url,
        success: false,
        filesFound: 0,
        location: "",
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }

  private emitStage(
    jobId: string,
    progress: number,
    stage: ScrapeStage,
    message: string,
  ) {
    this.gateway.emitProgress(jobId, progress, stage, message);
  }
}
