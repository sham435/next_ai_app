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
import { ScrapeService } from './scrape.service';
import type { ScrapeResponse } from '@scrape-platform/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000', 'https://web-production-b5dcf.up.railway.app'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ScrapeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ScrapeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly scrapeService: ScrapeService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('startScrape')
  async handleScrape(
    @MessageBody() data: { url: string },
    @ConnectedSocket() client: Socket,
  ): Promise<ScrapeResponse> {
    try {
      const result = await this.scrapeService.addToQueue(data.url);
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Emit progress update to all connected clients
   */
  emitProgress(jobId: string, progress: number, stage: string, message?: string) {
    this.server.emit(`progress:${jobId}`, { jobId, progress, stage, message });
  }

  /**
   * Emit job completion to all connected clients
   */
  emitComplete(jobId: string, result: Record<string, unknown>) {
    this.server.emit(`complete:${jobId}`, result);
  }
}
