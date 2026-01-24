import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@/auth/services/jwt.service';

/**
 * JWT Authentication Guard
 *
 * Validates JWT tokens from Authorization header.
 * Extracts and attaches user info to request object.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; phone: string; role: string };
    }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = this.jwtService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user info to request for use in controllers/services
    request.user = {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
    };

    return true;
  }

  /**
   * Extract JWT token from Authorization header
   * Format: "Bearer <token>"
   */
  private extractTokenFromHeader(request: {
    headers: { authorization?: string };
  }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
