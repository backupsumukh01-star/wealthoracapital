import type { Role, StaffRole } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  role: Role
  staffRole: StaffRole | null
  sessionId: string
  permissions: string[]
}

export interface SalesAuthIdentity {
  id: string
  email: string
  name: string
  code: string
  status: 'ACTIVE' | 'DISABLED'
  sessionId: string
}

declare global {
  namespace Express {
    interface Locals {
      requestId: string
    }

    interface Request {
      user?: AuthUser
      salesman?: SalesAuthIdentity
      requestId?: string
    }
  }
}

export {}
