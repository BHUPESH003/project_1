import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InfobipProvider } from './infobip.provider';
import { OtpProviderType } from '../interfaces/otp-provider.interface';

// Mock fetch globally
global.fetch = jest.fn();

describe('InfobipProvider', () => {
  let provider: InfobipProvider;
  let configService: ConfigService;

  const mockConfig = {
    INFOBIP_BASE_URL: 'https://api.infobip.com',
    INFOBIP_API_KEY: 'test-api-key',
    INFOBIP_SENDER: 'TESTAPP',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfobipProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
          },
        },
      ],
    }).compile();

    provider = module.get<InfobipProvider>(InfobipProvider);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should return INFOBIP as provider name', () => {
    expect(provider.getName()).toBe(OtpProviderType.INFOBIP);
  });

  it('should send OTP successfully', async () => {
    const mockResponse = {
      messages: [
        {
          messageId: 'test-message-id',
          status: { groupId: 1, groupName: 'PENDING', id: 7, name: 'PENDING_ENROUTE' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await provider.sendOtp('+1234567890', '123456');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('test-message-id');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.infobip.com/sms/2/text/advanced',
      {
        method: 'POST',
        headers: {
          Authorization: 'App test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: 'TESTAPP',
              destinations: [{ to: '+1234567890' }],
              text: 'Your OTP is 123456. Valid for 5 minutes.',
            },
          ],
        }),
      },
    );
  });

  it('should handle API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('Invalid request'),
    });

    const result = await provider.sendOtp('+1234567890', '123456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Infobip API error: 400 Bad Request');
  });

  it('should handle network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await provider.sendOtp('+1234567890', '123456');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle missing configuration', async () => {
    // Create a new provider instance with missing config
    const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
      providers: [
        InfobipProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ''), // Return empty string for all config
          },
        },
      ],
    }).compile();

    const providerWithMissingConfig = moduleWithMissingConfig.get<InfobipProvider>(InfobipProvider);

    const result = await providerWithMissingConfig.sendOtp('+1234567890', '123456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Infobip configuration missing');
  });
});