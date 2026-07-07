import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QUEUE_NAMES } from '@zonvo/constants';

import type { AppConfig } from '../../config/configuration';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceSession } from './entities/device-session.entity';
import { GdprErasureJob } from './entities/gdpr-erasure-job.entity';
import { UserConsent } from './entities/user-consent.entity';
import { UserCredential } from './entities/user-credential.entity';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrgScopeGuard } from './guards/org-scope.guard';
import { RbacGuard } from './guards/rbac.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        privateKey: config.get('jwt.privateKey', { infer: true }),
        publicKey: config.get('jwt.publicKey', { infer: true }),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get('jwt.accessExpiry', { infer: true }),
        },
        verifyOptions: { algorithms: ['RS256'] },
      }),
    }),

    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserCredential,
      UserConsent,
      DeviceSession,
      GdprErasureJob,
      OrganizationMember,
      Role,
      Permission,
    ]),

    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RbacGuard, OrgScopeGuard],
  exports: [AuthService, JwtAuthGuard, RbacGuard, OrgScopeGuard, JwtModule],
})
export class AuthModule {}
