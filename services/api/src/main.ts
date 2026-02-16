import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@/common/filters';
import { TransformInterceptor } from '@/common/interceptors';

/**
 * Validate required environment variables for production readiness
 */
function validateEnvironment() {
  const logger = new Logger('EnvironmentValidation');
  const requiredVars = [
    // Database
    'DATABASE_URL',
    // Auth
    'JWT_SECRET',
    // Payments
    'PAYTM_MERCHANT_ID',
    'PAYTM_MERCHANT_KEY',
    // Delivery
    'UBER_CLIENT_ID',
    'UBER_CLIENT_SECRET',
    'UBER_WEBHOOK_SECRET',
    // Notifications
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
    // File Storage
    'S3_BUCKET_NAME',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    // Queues
    'REDIS_URL',
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    logger.error(
      `❌ MISSING REQUIRED ENVIRONMENT VARIABLES: ${missingVars.join(', ')}`,
    );
    logger.error(
      '🚨 SYSTEM CANNOT START - PRODUCTION INTEGRATIONS REQUIRE THESE VARIABLES',
    );
    process.exit(1);
  }

  logger.log('✅ All required environment variables are present');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment before starting
  validateEnvironment();
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for debugging
  });

  // Get config service
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  // const corsEnabled = configService.get<boolean>('CORS_ENABLED', false);
  // logger.log(`CORS_ENABLED: ${corsEnabled}`);
  // if (corsEnabled) {
  //   const corsOrigins = configService
  //     .get<string>('CORS_ORIGINS', '*')
  //     .split(',');
  //   app.enableCors({
  //     origin: corsOrigins,
  //     credentials: true,
  //   });
  //   logger.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);
  // } else {
  //   logger.log('CORS disabled');
  // }
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allows requests from:
      // - file:// (origin === undefined)
      // - any http/https origin
      if (!origin) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  });

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response transform interceptor
  // Ensures all responses follow the standard format: { code, data, message }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  // Handle graceful shutdown
  // PrismaService handles cleanup via OnModuleDestroy lifecycle hook
  process.on('SIGTERM', () => {
    void (async () => {
      logger.log('SIGTERM received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    })();
  });

  process.on('SIGINT', () => {
    void (async () => {
      logger.log('SIGINT received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    })();
  });

  // Start server
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}

bootstrap();
