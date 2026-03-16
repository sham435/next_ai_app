import { z } from 'zod';

/**
 * Zod schema for scrape request validation (frontend)
 */
export const ScrapeRequestSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Only HTTPS URLs are allowed')
    .max(2048, 'URL is too long'),
});

/**
 * Zod schema for scrape response validation
 */
export const ScrapeResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string().optional(),
  filesFound: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  error: z.string().optional(),
});

export type ValidatedScrapeRequest = z.infer<typeof ScrapeRequestSchema>;
export type ValidatedScrapeResponse = z.infer<typeof ScrapeResponseSchema>;
