import { Router } from 'express'

import { healthController } from '../controllers/health.controller.js'

export const healthRouter = Router()

healthRouter.get('/health', healthController.health)
healthRouter.get('/health/live', healthController.live)
healthRouter.get('/health/ready', healthController.ready)
healthRouter.get('/metrics', healthController.metrics)
healthRouter.get('/version', healthController.version)
