import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Permission } from '@zonvo/types';

import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';
import type { FastifyRequest } from 'fastify';

/**
 * Checks that the authenticated user has all required permissions.
 * Must be used AFTER JwtAuthGuard.
 * Required permissions are declared via @RequirePermissions() decorator.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required — allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasAll = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAll) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
