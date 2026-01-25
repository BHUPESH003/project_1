import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpProviderRegistry } from './providers/registry/otp-provider.registry';
import { TwilioProvider } from './providers/twilio/twilio.provider';
import { InfobipProvider } from './providers/infobip/infobip.provider';
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
    // Register OTP providers
    {
      provide: TwilioProvider,
      useFactory: (configService: ConfigService) => {
        return new TwilioProvider(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: InfobipProvider,
      useFactory: (configService: ConfigService) => {
        return new InfobipProvider(configService);
      },
      inject: [ConfigService],
    },
    // Register provider in registry based on config
    {
      provide: 'OTP_PROVIDER_REGISTRATION',
      useFactory: (
        configService: ConfigService,
        registry: OtpProviderRegistry,
        twilioProvider: TwilioProvider,
        infobipProvider: InfobipProvider,
      ) => {
        const providerType = configService.get<string>('OTP_PROVIDER', 'twilio').toLowerCase();

        switch (providerType) {
          case 'twilio':
            registry.register(twilioProvider);
            break;
          case 'infobip':
            registry.register(infobipProvider);
            break;
          default:
            // Default to Twilio if invalid provider specified
            registry.register(twilioProvider);
            break;
        }

        return true;
      },
      inject: [ConfigService, OtpProviderRegistry, TwilioProvider, InfobipProvider],
    },
  ],
  exports: [AuthService, JwtService],
})
export class AuthModule {}
