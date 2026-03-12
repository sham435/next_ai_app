import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as dns from 'dns/promises';
import * as net from 'net';

/**
 * SSRF prevention service
 * Blocks requests to internal/private IP addresses
 */
@Injectable()
export class SsrfGuardService {
  private readonly logger = new Logger(SsrfGuardService.name);

  private readonly blockedRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
    /^fd/,
  ];

  async validateUrl(url: string): Promise<void> {
    try {
      const parsed = new URL(url);

      // Block non-HTTPS
      if (parsed.protocol !== 'https:') {
        throw new BadRequestException('Only HTTPS URLs are allowed');
      }

      // Block localhost variants
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '0.0.0.0' ||
        hostname === '[::1]'
      ) {
        throw new BadRequestException('Internal URLs are not allowed');
      }

      // Resolve DNS and check IP
      const { address } = await dns.lookup(hostname);

      for (const range of this.blockedRanges) {
        if (range.test(address)) {
          this.logger.warn(
            `SSRF blocked: ${url} resolved to private IP ${address}`,
          );
          throw new BadRequestException('Internal URLs are not allowed');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Invalid URL: ${(error as Error).message}`);
    }
  }
}
