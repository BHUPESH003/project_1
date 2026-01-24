import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/types';

/**
 * Roles Decorator
 * Used to specify required roles for endpoints
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    } else if (key) {
      Reflect.defineMetadata(ROLES_KEY, roles, target[key]);
    } else {
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
  };
};

/**
 * Roles Guard
 *
 * Validates user role against required roles for endpoint.
 * Must be used after JwtAuthGuard (which sets request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata (set by @Roles decorator)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `User ${user.id} (${user.role}) attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
