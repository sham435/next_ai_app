import { IsUrl, IsOptional, IsIn } from 'class-validator';
import type { ScrapeMethod } from '@scrape-platform/shared-types';

export class ScrapeDto {
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['https'],
    },
    { message: 'Only HTTPS URLs are allowed' },
  )
  url!: string;

  @IsOptional()
  @IsIn(['fast', 'full', 'puppeteer', 'static'])
  method?: ScrapeMethod = 'fast';
}
