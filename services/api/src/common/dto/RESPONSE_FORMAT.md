# API Response Format Standard

## Overview

All API responses follow a consistent format to ensure frontend can reliably parse responses:

```json
{
  "code": number,      // HTTP status code (200, 201, 400, 401, etc.)
  "data": T,           // Response payload (can be any type: object, array, null)
  "message": string    // Human-readable message describing the result
}
```

## Implementation

### Success Responses

The `TransformInterceptor` automatically wraps all successful responses:

**Controller returns:**
```typescript
return { id: '123', name: 'John' };
```

**API Response:**
```json
{
  "code": 200,
  "data": {
    "id": "123",
    "name": "John"
  },
  "message": "Success"
}
```

### Error Responses

The `HttpExceptionFilter` formats all errors:

**Thrown exception:**
```typescript
throw new NotFoundException('User not found');
```

**API Response:**
```json
{
  "code": 404,
  "data": null,
  "message": "User not found"
}
```

## Examples

### Success - Single Object
```json
{
  "code": 200,
  "data": {
    "id": "seller-123",
    "shopName": "Fast Print Shop",
    "status": "ONLINE"
  },
  "message": "Success"
}
```

### Success - Array
```json
{
  "code": 200,
  "data": [
    { "id": "cat-1", "name": "Printing" },
    { "id": "cat-2", "name": "Stationery" }
  ],
  "message": "Success"
}
```

### Success - Empty Data
```json
{
  "code": 200,
  "data": null,
  "message": "OTP sent successfully"
}
```

### Error - Validation
```json
{
  "code": 400,
  "data": null,
  "message": "Phone number must be in E.164 format"
}
```

### Error - Not Found
```json
{
  "code": 404,
  "data": null,
  "message": "Seller with ID abc123 not found"
}
```

### Error - Unauthorized
```json
{
  "code": 401,
  "data": null,
  "message": "Invalid or expired OTP code"
}
```

## Custom Messages

If a service wants to return a custom message, it can return an object with `code`, `data`, and `message`:

```typescript
return {
  code: 200,
  data: { id: '123' },
  message: 'Custom success message'
};
```

The interceptor will detect this format and use it as-is.

## Helper Functions

Use helper functions from `@/common/dto/api-response.dto`:

```typescript
import { successResponse, errorResponse } from '@/common/dto/api-response.dto';

// Success
return successResponse({ id: '123' }, 'User created', 201);

// Error (usually handled by exception filter)
throw new BadRequestException('Invalid input');
```

## Status Codes

- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Frontend Integration

Frontend can consistently parse all responses:

```typescript
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

async function fetchData() {
  const response = await fetch('/api/v1/categories');
  const result: ApiResponse<Category[]> = await response.json();
  
  if (result.code === 200) {
    // Use result.data
    console.log(result.data);
  } else {
    // Show error message
    console.error(result.message);
  }
}
```
