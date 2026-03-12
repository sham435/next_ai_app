import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ScrapeController } from './scrape.controller';
import { ScrapeService } from './scrape.service';
import { ScrapeProcessor } from './scrape.processor';
import { ScrapeGateway } from './scrape.gateway';
import { SsrfGuardService } from './ssrf-guard.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scrape' }),
    BullBoardModule.forFeature({ name: 'scrape', adapter: BullMQAdapter }),
    MetricsModule,
  ],
  controllers: [ScrapeController],
  providers: [ScrapeService, ScrapeProcessor, ScrapeGateway, SsrfGuardService],
})
export class ScrapeModule {}
