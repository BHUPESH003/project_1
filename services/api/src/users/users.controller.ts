import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Users Controller - MVP Scope
 *
 * ⚠️ NO USER CRUD IN API CONTRACT v1
 *
 * Users are created automatically during OTP verification in auth module.
 *
 * API Contract v1 does NOT include:
 * - User profile management
 * - User CRUD operations
 * - User listing
 *
 * Removed all endpoints:
 * - create() - Users auto-created via auth
 * - findAll() - Not in contract, violates privacy
 * - findOne() - Not needed in MVP
 * - update() - Not needed in MVP
 * - remove() - Dangerous, not in contract
 *
 * TODO: In future versions, may add:
 * - GET /v1/users/me (self profile)
 * - PATCH /v1/users/me (update self profile)
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ❌ ALL ENDPOINTS REMOVED - Not in API Contract v1
  // Users managed internally via auth flow
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: N/A - No endpoints remain. User management is handled via auth module.
 */
