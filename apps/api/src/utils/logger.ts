import pino from 'pino'

import { env, isDevelopment } from '../config/env.js'

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'growzy-api',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})
