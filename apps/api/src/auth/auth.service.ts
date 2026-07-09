import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface ApiUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

@Injectable()
export class AuthService {
  private readonly apiKeys: Map<string, ApiUser> = new Map();

  constructor(private jwtService: JwtService) {
    const keys = process.env.API_KEYS;
    if (keys) {
      for (const entry of keys.split(',')) {
        const [key, name, role] = entry.split(':');
        this.apiKeys.set(key, {
          id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 12),
          name: name || 'default',
          role: (role as ApiUser['role']) || 'user',
        });
      }
    }
  }

  validateApiKey(key: string): ApiUser | null {
    return this.apiKeys.get(key) || null;
  }

  async login(apiKey: string): Promise<{ accessToken: string; user: ApiUser }> {
    const user = this.validateApiKey(apiKey);
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }
    return {
      accessToken: this.jwtService.sign({ sub: user.id, name: user.name, role: user.role }),
      user,
    };
  }

  generateApiKey(name: string, role: ApiUser['role'] = 'user'): string {
    const key = `skp_${crypto.randomBytes(24).toString('hex')}`;
    this.apiKeys.set(key, {
      id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 12),
      name,
      role,
    });
    return key;
  }
}
