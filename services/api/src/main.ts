import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@/common/filters';
import { TransformInterceptor } from '@/common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  const corsEnabled = configService.get<boolean>('CORS_ENABLED', true);
  if (corsEnabled) {
    const corsOrigins = configService
      .get<string>('CORS_ORIGINS', 'http://localhost:3000')
      .split(',');
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  }

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
  logger.log(
    `📚 Swagger documentation: http://localhost:${port}/docs`,
  );
}

bootstrap();
