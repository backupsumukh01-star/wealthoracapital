import type { Role, StaffRole } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'

import { forbidden, unauthorized } from '../utils/errors.js'

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized())
      return
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden())
      return
    }
    next()
  }
}

/** RBAC guard for staff console operators (Finance, Support, KYC, Content, Viewer, Admin). */
export function requireStaffRoles(...staffRoles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized())
      return
    }

    if (req.user.role === 'SUPER_ADMIN') {
      next()
      return
    }

    if (!req.user.staffRole || !staffRoles.includes(req.user.staffRole)) {
      next(forbidden())
      return
    }
    next()
  }
}
