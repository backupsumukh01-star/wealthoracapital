import { ERROR_CODES, type ErrorCode } from '@meridian/shared'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode | string
  public readonly details?: unknown
  public readonly isOperational: boolean

  constructor(
    statusCode: number,
    code: ErrorCode | string,
    message: string,
    details?: unknown,
    isOperational = true,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, details)
}

export function unauthorized(
  message = 'Authentication required.',
  code: ErrorCode = ERROR_CODES.UNAUTHENTICATED,
): AppError {
  return new AppError(401, code, message)
}

export function forbidden(message = 'You do not have permission to perform this action.'): AppError {
  return new AppError(403, ERROR_CODES.FORBIDDEN, message)
}

export function notFound(message = 'Resource not found.'): AppError {
  return new AppError(404, ERROR_CODES.NOT_FOUND, message)
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError(409, ERROR_CODES.CONFLICT, message, details)
}

export function tooManyRequests(message = 'Too many requests. Please try again later.'): AppError {
  return new AppError(429, ERROR_CODES.RATE_LIMITED, message)
}

export function internalError(message = 'An unexpected error occurred.'): AppError {
  return new AppError(500, ERROR_CODES.INTERNAL_ERROR, message, undefined, false)
}
