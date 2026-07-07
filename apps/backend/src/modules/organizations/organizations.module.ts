import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Organization } from './entities/organization.entity';
import { OrganizationBranding } from './entities/organization-branding.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { HostOnboardingProgress } from './entities/host-onboarding-progress.entity';
import { User } from '../auth/entities/user.entity';
import { License } from '../licenses/entities/license.entity';
import { Role } from '../rbac/entities/role.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController, AcceptInvitationController } from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationBranding,
      OrganizationMember,
      HostOnboardingProgress,
      User,
      License,
      Role,
    ]),
  ],
  controllers: [OrganizationsController, AcceptInvitationController],
  providers: [OrganizationsService],
  exports: [OrganizationsService, TypeOrmModule],
})
export class OrganizationsModule {}

