import { SetMetadata } from '@nestjs/common';

import type { Permission } from '@zonvo/types';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declare which permissions are required to access a route.
 * Evaluated by RbacGuard.
 *
 * Usage: @RequirePermissions(PERMISSIONS.WEBINAR_CREATE, PERMISSIONS.RECORDING_UPLOAD)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
