import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ScrapeService } from './scrape.service';
import { ScrapeDto } from './dto/scrape.dto';
import type { ScrapeResponse } from '@scrape-platform/shared-types';

@Controller('scrape')
@UseGuards(ThrottlerGuard)
export class ScrapeController {
  private readonly logger = new Logger(ScrapeController.name);

  constructor(private readonly scrapeService: ScrapeService) {}

  @Post()
  async scrape(@Body() dto: ScrapeDto): Promise<ScrapeResponse> {
    this.logger.log(`Scrape request for: ${dto.url}`);
    return this.scrapeService.addToQueue(dto.url);
  }
}
