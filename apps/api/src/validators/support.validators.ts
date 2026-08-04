import { z } from 'zod'

const categoryEnum = z.enum(['GENERAL', 'BILLING', 'KYC', 'DEPOSIT', 'WITHDRAWAL', 'TECHNICAL', 'ACCOUNT', 'OTHER'])
const priorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
const statusEnum = z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'])

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(4000),
  category: categoryEnum.optional(),
})

export const replyTicketSchema = z.object({
  message: z.string().trim().min(1).max(4000),
})

export const adminListQuerySchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: categoryEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
})

export const assignTicketSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
})

export const priorityUpdateSchema = z.object({ priority: priorityEnum })
export const categoryUpdateSchema = z.object({ category: categoryEnum })
export const internalNoteSchema = z.object({ note: z.string().trim().min(1).max(4000) })
export const mergeTicketSchema = z.object({ targetId: z.string().uuid() })
export const transferTicketSchema = z.object({ assigneeId: z.string().uuid() })
