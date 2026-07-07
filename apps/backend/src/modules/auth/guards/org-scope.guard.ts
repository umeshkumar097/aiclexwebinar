import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FastifyRequest } from 'fastify';

import { HTTP_HEADERS } from '@zonvo/constants';

import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

export interface OrgScopedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  activeOrgId: string;
  orgMembership: OrganizationMember;
}

/**
 * Validates X-Organization-ID header, confirms user is an active member,
 * and attaches org context to request.
 *
 * Must be used AFTER JwtAuthGuard.
 */
@Injectable()
export class OrgScopeGuard implements CanActivate {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrgScopedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId = request.headers[HTTP_HEADERS.ORGANIZATION_ID] as string | undefined;

    if (!orgId) {
      throw new ForbiddenException(
        `Header '${HTTP_HEADERS.ORGANIZATION_ID}' is required for this endpoint`,
      );
    }

    // Super Admin and Platform Admin bypass org membership check
    if (user.roles.includes('super_admin') || user.roles.includes('platform_admin')) {
      (request as OrgScopedRequest).activeOrgId = orgId;
      return true;
    }

    const membership = await this.memberRepository.findOne({
      where: { userId: user.userId, orgId },
      relations: ['role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    (request as OrgScopedRequest).activeOrgId = orgId;
    (request as OrgScopedRequest).orgMembership = membership;

    return true;
  }
}
