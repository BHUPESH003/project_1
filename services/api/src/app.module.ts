import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryModule } from './delivery/delivery.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { LocationModule } from './location/location.module';
import { BannersModule } from './banners/banners.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SearchModule } from './search/search.module';
import { CartModule } from './cart/cart.module';
import { ProductsModule } from './products/products.module';
import { CacheModule } from './cache/cache.module';
import { CheckoutModule } from './checkout/checkout.module';
import { MessagingModule } from './messaging/messaging.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    // Configuration - MUST be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Cache (depends on ConfigModule)
    CacheModule,
    // Prisma (Global module)
    PrismaModule,
    // Rate limiting — 100 req/60s for general use; OTP routes override to 10/60s in AuthModule
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL_MS', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    // Health check
    HealthModule,
    // Feature modules
    AuthModule,
    UsersModule,
    SellersModule,
    CategoriesModule,
    OrdersModule,
    DeliveryModule,
    PaymentsModule,
    FilesModule,
    AdminModule,
    NotificationsModule,
    QueueModule,
    LocationModule,
    BannersModule,
    FavoritesModule,
    SearchModule,
    CartModule,
    ProductsModule,
    CheckoutModule,
    MessagingModule,
    DiscoveryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
