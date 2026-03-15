import re

path = r"c:\Users\Jogender.Yadav1\projects\internal RnD\project_1\services\api\src\queue\queue.module.ts"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add connection timeouts to Redis connection
text = text.replace(
    '''connection: {
              url: redisUrl,
            },''',
    '''connection: {
              url: redisUrl,
              enableOfflineQueue: false,
              commandTimeout: 2000,
            },'''
)

text = text.replace(
    '''connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
          },''',
    '''connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            enableOfflineQueue: false,
            commandTimeout: 2000,
          },'''
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("queue module updated")
