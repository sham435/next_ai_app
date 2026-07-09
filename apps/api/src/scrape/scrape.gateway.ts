import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ScrapeService } from './scrape.service';
import type { ScrapeResponse, ScrapeMethod } from '@scrape-platform/shared-types';

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL || process.env.RAILWAY_SERVICE_WEB_URL)?.split(',') ?? [
      'http://localhost:3000',
      'https://web-production-b5dcf.up.railway.app',
    ],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ScrapeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ScrapeGateway.name);
  private queueEvents: QueueEvents;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly scrapeService: ScrapeService,
    private readonly config: ConfigService,
  ) {
    this.queueEvents = new QueueEvents('scrape', {
      connection: {
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD') || undefined,
      },
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      this.server.emit(`progress:${jobId}`, {
        jobId,
        progress: data,
        stage: 'scraping',
        message: `Progress: ${data}%`,
      });
    });

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      try {
        const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
        this.server.emit(`complete:${jobId}`, result);
      } catch {
        this.server.emit(`complete:${jobId}`, { jobId, success: true });
      }
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.server.emit(`complete:${jobId}`, {
        jobId,
        success: false,
        error: failedReason,
        filesFound: 0,
        duration: 0,
      });
    });
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  emitProgress(jobId: string, progress: number, stage: string, message?: string) {
    this.server.emit(`progress:${jobId}`, { jobId, progress, stage, message });
  }

  emitComplete(jobId: string, result: Record<string, unknown>) {
    this.server.emit(`complete:${jobId}`, result);
  }

  @SubscribeMessage('startScrape')
  async handleScrape(
    @MessageBody() data: { url: string; method?: ScrapeMethod },
    @ConnectedSocket() client: Socket,
  ): Promise<ScrapeResponse> {
    try {
      const result = await this.scrapeService.addToQueue(data.url, data.method);
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
