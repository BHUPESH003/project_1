# Repository Pattern Implementation

## Overview

The repository pattern has been implemented to abstract database access from business logic. This allows:
- **ORM Independence**: Easy to swap Prisma for TypeORM, raw SQL, or any other data access layer
- **Testability**: Repositories can be easily mocked in unit tests
- **Centralized Queries**: All database queries are in one place per entity
- **Type Safety**: Custom entity types ensure consistency across the application

## Architecture

```
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Prisma Client (ORM)
    ↓
PostgreSQL Database
```

## Repository Structure

### Base Repository Interface

All repositories implement `IBaseRepository<T>` which defines standard CRUD operations:
- `findById(id: string): Promise<T | null>`
- `findAll(filters?: Record<string, unknown>): Promise<T[]>`
- `create(data: Partial<T>): Promise<T>`
- `update(id: string, data: Partial<T>): Promise<T>`
- `delete(id: string): Promise<void>`

### Implemented Repositories

1. **UserRepository** (`@/users/repositories/user.repository.ts`)
   - `findByPhone(phone: string)`
   - `findOrCreate(data)`

2. **OtpRepository** (`@/auth/repositories/otp.repository.ts`)
   - `create(data)`
   - `findValidOtp(phone, code)`
   - `markAsVerified(id)`
   - `incrementAttempts(phone, code)`
   - `deleteExpired()`

3. **SellerRepository** (`@/sellers/repositories/seller.repository.ts`)
   - `findById(id, includeRelations)`
   - `findByUserId(userId)`
   - `findAvailable(filters)`
   - `updateStatus(id, status)`

4. **CategoryRepository** (`@/categories/repositories/category.repository.ts`)
   - `findActiveAndComingSoon()`
   - Implements `IBaseRepository<CategoryEntity>`

## Key Features

### Enum Type Mapping

Repositories handle the conversion between Prisma's generated enum types and our custom enum types from `@repo/types`:

```typescript
private mapToEntity(user: PrismaUser): UserEntity {
  return {
    ...user,
    role: user.role as UserRole, // Type assertion for enum compatibility
  };
}
```

### Entity Types

Each repository defines its own `Entity` interface that represents the shape of data returned to services:

```typescript
export interface UserEntity {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: UserRole; // Custom enum from @repo/types
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage in Services

Services now depend on repositories instead of Prisma directly:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private otpRepository: OtpRepository,
  ) {}

  async verifyOtp(dto: VerifyOtpDto) {
    // Use repository instead of prisma.user.findUnique
    const user = await this.userRepository.findByPhone(dto.phone);
    // ...
  }
}
```

## Module Configuration

Repositories are provided in their respective modules:

```typescript
@Module({
  providers: [UsersService, UserRepository],
  exports: [UsersService, UserRepository], // Export for use in other modules
})
export class UsersModule {}
```

## Benefits

1. **Easy ORM Migration**: To switch from Prisma to TypeORM:
   - Only update repository implementations
   - Services remain unchanged

2. **Better Testing**: Mock repositories in unit tests:
   ```typescript
   const mockUserRepository = {
     findByPhone: jest.fn().mockResolvedValue(mockUser),
   };
   ```

3. **Centralized Queries**: Complex queries are in one place, making them easier to optimize and maintain

4. **Type Safety**: Entity types ensure consistent data shapes across the application

## Future Repositories

As new modules are implemented, create repositories for:
- OrderRepository
- PaymentRepository
- DeliveryRepository
- FileRepository

## Migration Notes

- All Prisma calls have been moved from services to repositories
- Services now use repository methods exclusively
- Enum type mapping ensures compatibility between Prisma and custom types
- All repositories are properly injected via NestJS dependency injection
