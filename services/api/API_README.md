# API Service

A production-ready NestJS REST API following latest best practices (NestJS v11).

## Features

✅ **Core Setup**
- NestJS v11 with TypeScript (strict mode)
- Global validation with class-validator
- Swagger/OpenAPI documentation
- Health check endpoint
- Environment-based configuration
- Rate limiting with @nestjs/throttler
- Security headers with Helmet
- CORS support
- Global exception filtering
- Graceful shutdown

✅ **Modules**
- **Auth** - Authentication endpoints (login, register, logout)
- **Users** - User management CRUD
- **Sellers** - Seller management CRUD
- **Categories** - Category management CRUD
- **Orders** - Order management CRUD
- **Delivery** - Delivery tracking
- **Payments** - Payment processing
- **Files** - File upload/management
- **Admin** - Admin dashboard and operations
- **Notifications** - Notification system
- **Health** - Health check endpoint

✅ **Common Utilities**
- HTTP Exception Filter
- Logging Interceptor
- Transform Interceptor
- API Key Guard (placeholder)

## Getting Started

### Installation

```bash
pnpm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

### Running the App

```bash
# Development
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

### API Documentation

Once running, visit:
- API: `http://localhost:3000/api`
- Swagger Docs: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/health`

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## Project Structure

```
src/
├── admin/              # Admin module
├── auth/               # Authentication module
├── categories/         # Categories module
├── common/             # Shared utilities
│   ├── filters/        # Exception filters
│   ├── guards/         # Route guards
│   └── interceptors/   # Interceptors
├── delivery/           # Delivery module
├── files/              # File management
├── health/             # Health checks
├── notifications/      # Notifications module
├── orders/             # Orders module
├── payments/           # Payments module
├── sellers/            # Sellers module
├── users/              # Users module
├── app.module.ts       # Root module
└── main.ts             # Application entry
```

## Development Notes

- All modules are scaffolded with empty implementations
- DTOs use `Record<string, unknown>` placeholders - replace with proper DTOs using class-validator
- Add database integration (TypeORM, Prisma, etc.) as needed
- Implement authentication guards in the auth module
- Configure proper API keys or JWT in guards

## Monorepo Integration

This service is part of a pnpm monorepo. To reference shared packages:

```typescript
// Example: using shared types
import { SomeType } from '@project/types';
```

## License

UNLICENSED
