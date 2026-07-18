// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'SERVER' = 'SERVER'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/*
  Usage in actions:
  import { AppError } from '@/lib/errors'

  if (!user)           throw new AppError('Not authenticated', 'UNAUTHORIZED')
  if (existingLoan)    throw new AppError('Active loan already exists', 'CONFLICT')
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 'VALIDATION')
*/