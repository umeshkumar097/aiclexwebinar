import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AppConfig } from '../../../config/configuration';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  orgId: string | null;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  orgId: string | null;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AppConfig, true>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    const publicKey = configService.get('jwt.publicKey', { infer: true });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || user.status === UserStatus.DELETED || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Session invalid or account suspended');
    }
    
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email address.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      roles: payload.roles,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
  }
}
