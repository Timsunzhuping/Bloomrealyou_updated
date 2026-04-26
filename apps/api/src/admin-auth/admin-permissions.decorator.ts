import { SetMetadata } from '@nestjs/common';

import type { AdminPermission } from '@custom-merch/shared';

export const ADMIN_PERMISSION_KEY = 'adminPermission';

/**
 * Declarative permission gate. Pair with `AdminBearerGuard` and the guard
 * checks the request's resolved user against the RBAC table.
 *
 * Example:
 *   @UseGuards(AdminBearerGuard)
 *   @RequirePermission('orders.write')
 */
export const RequirePermission = (permission: AdminPermission): MethodDecorator & ClassDecorator =>
  SetMetadata(ADMIN_PERMISSION_KEY, permission);
