import type { Role, StaffRole } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  role: Role
  staffRole: StaffRole | null
  sessionId: string
}

declare global {
  namespace Express {
    interface Locals {
      requestId: string
    }

    interface Request {
      user?: AuthUser
      requestId?: string
    }
  }
}

export {}
