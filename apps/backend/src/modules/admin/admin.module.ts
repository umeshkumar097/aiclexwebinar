import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

import { User } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Webinar } from '../webinars/entities/webinar.entity';
import { License } from '../licenses/entities/license.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Role } from '../rbac/entities/role.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { RolePermission } from '../rbac/entities/role-permission.entity';

import { UserInvitation } from './entities/user-invitation.entity';
import { LicenseAssignment } from './entities/license-assignment.entity';
import { LicenseHistory } from './entities/license-history.entity';

// NotificationsModule is @Global() so NotificationsService is auto-available
// We still import it here to be explicit and avoid circular issues
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Webinar,
      License,
      AuditLog,
      Notification,
      Role,
      Permission,
      RolePermission,
      UserInvitation,
      LicenseAssignment,
      LicenseHistory,
    ]),
    JwtModule.register({}),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
