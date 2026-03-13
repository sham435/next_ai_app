import './tracing';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

function validateEnvironment() {
  const requiredVars: string[] = [];
  const recommendedVars: string[] = [
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.warn(`⚠️  Missing required environment variable: ${varName}`);
    }
  }

  for (const varName of recommendedVars) {
    if (!process.env[varName]) {
      console.warn(`⚠️  Missing recommended environment variable: ${varName}`);
    }
  }

  const env = process.env.NODE_ENV || 'development';
  console.log(`🌍 Running in ${env} mode`);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000', 'https://web-production-b5dcf.up.railway.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'accept-language'],
  });

  if (process.env.BULL_BOARD_PASSWORD) {
    app.use(
      '/admin/queues',
      basicAuth({
        users: { admin: process.env.BULL_BOARD_PASSWORD },
        challenge: true,
      }),
    );
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 API server running on http://localhost:${port}`);
  logger.log(`📊 Bull Board at http://localhost:${port}/admin/queues`);
  
  if (process.env.NODE_ENV === 'production') {
    logger.log(`🔒 Production mode - security features enabled`);
  }
}

bootstrap();
