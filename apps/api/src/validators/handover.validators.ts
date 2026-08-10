import { z } from 'zod'

import { HANDOVER_CONFIRM_PHRASE } from '../services/admin/handover-reset.service.js'

export const handoverModeSchema = z.enum(['TEST_DATA_RESET', 'FULL_HANDOVER_RESET'])

export const handoverPreviewSchema = z.object({
  mode: handoverModeSchema.default('TEST_DATA_RESET'),
})

export const handoverResetSchema = z.object({
  mode: handoverModeSchema,
  confirmationPhrase: z.string().min(1),
  confirm: z.literal(true),
})

export type HandoverPreviewInput = z.infer<typeof handoverPreviewSchema>
export type HandoverResetInput = z.infer<typeof handoverResetSchema>

export { HANDOVER_CONFIRM_PHRASE }
