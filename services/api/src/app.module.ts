import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    // Configuration - MUST be first (CacheModule and other modules depend on ConfigService)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Cache (depends on ConfigModule)
    CacheModule,
    // Prisma (Global module)
    PrismaModule,
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per ttl
      },
    ]),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}