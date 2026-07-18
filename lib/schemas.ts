// src/lib/schemas.ts
// lib/schemas.ts
import { z } from 'zod'

export const LoanApplicationSchema = z.object({
  principal_amount: z.number({ message: 'Principal amount must be a valid number' })
    .positive('Amount must be greater than 0'),
  term_days: z.number({ message: 'Term days must be a valid number' })
    .int()
    .positive(),
  purpose: z.string({ message: 'Purpose is required' })
    .min(3, 'Please provide a clearer purpose')
})

export const PaymentSchema = z.object({
  amount:           z.number().positive('Amount must be positive'),
  channel:          z.enum(['gcash', 'maya', 'bank_transfer', '7eleven', 'cash_pickup']),
  reference_number: z.string().min(1, 'Reference number is required'),
})

export const KycSchema = z.object({
  id_type:   z.enum(['philsys', 'passport', 'drivers_license', 'umid', 'sss', 'tin', 'postal_id', 'voters_id']),
  id_number: z.string().min(4, 'ID number too short').max(30, 'ID number too long'),
})