import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@/auth/services/jwt.service';

/**
 * Optional JWT guard: attaches user to request when valid Bearer token is present.
 * Does not reject when no token or invalid token (for public endpoints that benefit from auth when available).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; phone: string; role: string };
    }>();
    const token = request.headers?.authorization?.split(' ')?.[1];

    if (!token) return true;

    const payload = this.jwtService.verifyToken(token);
    if (payload) {
      request.user = {
        id: payload.sub,
        phone: payload.phone,
        role: payload.role,
      };
    }
    return true;
  }
}
