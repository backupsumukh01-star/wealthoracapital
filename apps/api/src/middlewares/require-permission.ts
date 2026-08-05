import type { NextFunction, Request, Response } from 'express'

import { isStaffUser, resolvePermissions, type Permission } from '../config/permissions.js'
import { forbidden, unauthorized } from '../utils/errors.js'

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized())
      return
    }

    const granted = new Set(
      req.user.permissions?.length
        ? req.user.permissions
        : resolvePermissions({ role: req.user.role, staffRole: req.user.staffRole }),
    )
    const allowed = permissions.every((permission) => granted.has(permission))

    if (!allowed) {
      next(forbidden('Missing required permission.'))
      return
    }

    next()
  }
}

export function requireAdminAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized())
    return
  }
  if (!isStaffUser({ role: req.user.role, staffRole: req.user.staffRole })) {
    next(forbidden('Admin access required.'))
    return
  }
  next()
}
