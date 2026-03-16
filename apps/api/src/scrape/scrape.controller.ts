import { Controller, Post, Body, UseGuards, Logger, Get, Param, Res, Req } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ScrapeService } from './scrape.service';
import { ScrapeDto } from './dto/scrape.dto';
import type { ScrapeResponse } from '@scrape-platform/shared-types';
import { Request, Response } from 'express';

@Controller('scrape')
@UseGuards(ThrottlerGuard)
export class ScrapeController {
  private readonly logger = new Logger(ScrapeController.name);

  constructor(private readonly scrapeService: ScrapeService) {}

  @Post()
  async scrape(@Body() dto: ScrapeDto): Promise<ScrapeResponse> {
    this.logger.log(`Scrape request for: ${dto.url} (method: ${dto.method || 'fast'})`);
    return this.scrapeService.addToQueue(dto.url, dto.method);
  }

  @Post('download')
  async downloadAndZip(@Body() body: { url: string }, @Req() req: Request, @Res() res: Response) {
    try {
      const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'https://scraper-production.up.railway.app';
      
      const response = await fetch(`${scraperUrl}/scrape-and-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to create download' });
      }
      
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename=scraped.zip',
      });
      
      response.body?.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
      
    } catch (error) {
      this.logger.error('Download error:', error);
      res.status(500).json({ error: 'Failed to create download' });
    }
  }

  @Get('list/*path')
  async listFiles(@Param('path') path: string) {
    try {
      const url = decodeURIComponent(path);
      const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'https://scraper-production.up.railway.app';
      
      const response = await fetch(`${scraperUrl}/files/${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        return { error: 'Failed to list files' };
      }
      
      return response.json();
    } catch (error) {
      return { error: 'Failed to list files' };
    }
  }
}
