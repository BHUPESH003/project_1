import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpProviderRegistry } from './providers/registry/otp-provider.registry';
import { TwilioProvider } from './providers/twilio/twilio.provider';
import { OtpService } from './services/otp.service';
import { JwtService } from './services/jwt.service';
import { OtpRepository } from './repositories/otp.repository';
import { UserRepository } from '@/users/repositories/user.repository';
import { UsersModule } from '@/users/users.module';
import { JWT_CONFIG, getConfigValue } from '@/constants';

/**
 * Auth Module
 *
 * OTP-based authentication with abstracted provider system.
 * Currently configured with Twilio, but can be easily swapped.
 *
 * To change OTP provider:
 * 1. Create new provider implementing OtpProvider interface
 * 2. Register it here instead of TwilioProvider
 * 3. No changes needed to AuthService or other components
 */
@Module({
  imports: [
    UsersModule, // Import UsersModule to access UserRepository
    // JWT Module configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = getConfigValue<string>(
          configService,
          'JWT_SECRET',
          'your-secret-key-change-in-production',
        );
        const expiresInValue = getConfigValue<string>(
          configService,
          'JWT_EXPIRATION',
          JWT_CONFIG.DEFAULT_EXPIRATION_STRING,
        );
        return {
          secret,
          signOptions: {
            expiresIn: expiresInValue,
          },
        } as JwtModuleOptions;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtService,
    OtpRepository, // Repository for OTP operations
    OtpProviderRegistry,
    // Register OTP provider here
    // To change provider, replace TwilioProvider with your provider
    {
      provide: TwilioProvider,
      useFactory: (configService: ConfigService) => {
        return new TwilioProvider(configService);
      },
      inject: [ConfigService],
    },
    // Register provider in registry
    {
      provide: 'OTP_PROVIDER_REGISTRATION',
      useFactory: (
        registry: OtpProviderRegistry,
        twilioProvider: TwilioProvider,
      ) => {
        registry.register(twilioProvider);
        return true;
      },
      inject: [OtpProviderRegistry, TwilioProvider],
    },
  ],
  exports: [AuthService, JwtService],
})
export class AuthModule {}
