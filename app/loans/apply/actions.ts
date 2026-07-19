'use server'

import { createClient } from '@/lib/supabase/server'
import { evaluateLoanApplication } from '@/lib/underwriting'
import { redirect } from 'next/navigation'
import { LoanApplicationSchema } from '@/lib/schemas'
import { getValidInstallmentCounts } from '@/lib/installments'

const PAYOUT_METHODS = ['gcash', 'maya', 'bank_transfer', 'cash_pickup'] as const

function generateInstallmentSchedule(
  loanId: string,
  totalRepayable: number,
  termDays: number,
  numInstallments: number,
  startDate: Date
) {
  const intervalDays = Math.round(termDays / numInstallments)
  const baseInstallmentAmount = Math.floor((totalRepayable / numInstallments) * 100) / 100
  const schedule = []
  let accumulatedAmount = 0

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(startDate)
    const isLast = i === numInstallments
    dueDate.setDate(dueDate.getDate() + (isLast ? termDays : intervalDays * i))

    const amountDue = isLast
      ? Number((totalRepayable - accumulatedAmount).toFixed(2))
      : baseInstallmentAmount

    accumulatedAmount += amountDue

    schedule.push({
      loan_id: loanId,
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      amount_due: amountDue,
      status: 'upcoming'
    })
  }

  return schedule
}

export async function submitLoanApplication(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const parsed = LoanApplicationSchema.safeParse({
    principal_amount: parseFloat(formData.get('principal_amount') as string),
    term_days:        parseInt(formData.get('term_days') as string, 10),
    purpose:          formData.get('purpose'),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }
  const { principal_amount: principalAmount, term_days: termDays, purpose } = parsed.data

  const numInstallments = parseInt(formData.get('num_installments') as string, 10)
  const validCounts = getValidInstallmentCounts(termDays)
  if (!Number.isInteger(numInstallments) || !validCounts.includes(numInstallments)) {
    throw new Error(`Please choose a valid number of installments for a ${termDays}-day term.`)
  }

  // ── PAYOUT DESTINATION ──
  // Defaults to the borrower's saved disbursement details. The form may
  // submit an override (use_custom_payout=1) with its own method/name/number.
  const { data: borrower } = await supabase
    .from('borrowers')
    .select('disbursement_method, disbursement_account_name, disbursement_account_number')
    .eq('id', user.id)
    .maybeSingle()

  const useCustomPayout = formData.get('use_custom_payout') === '1'

  let payoutMethod: string | null
  let payoutAccountName: string | null
  let payoutAccountNumber: string | null

  if (useCustomPayout) {
    payoutMethod = formData.get('payout_method') as string
    payoutAccountName = (formData.get('payout_account_name') as string)?.trim()
    payoutAccountNumber = (formData.get('payout_account_number') as string)?.trim()

    if (!payoutMethod || !PAYOUT_METHODS.includes(payoutMethod as any)) {
      throw new Error('Please select a valid payout method.')
    }
    if (!payoutAccountName || !payoutAccountNumber) {
      throw new Error('Please provide the payout account name and number.')
    }
  } else {
    payoutMethod = borrower?.disbursement_method ?? null
    payoutAccountName = borrower?.disbursement_account_name ?? null
    payoutAccountNumber = borrower?.disbursement_account_number ?? null

    if (!payoutMethod || !payoutAccountName || !payoutAccountNumber) {
      throw new Error('Please add your payout details to your profile, or provide them below, before applying.')
    }
  }

  // RATE LIMIT GUARD
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: recentApplication } = await supabase
    .from('loans')
    .select('id')
    .eq('borrower_id', user.id)
    .in('status', ['pending', 'active'])   // ← only block if there's a live loan
    .gte('created_at', fiveMinutesAgo)
    .maybeSingle()

  if (recentApplication) {
    throw new Error('Please wait a few minutes before submitting another application.')
  }

  // Credit-exposure and eligibility checks now live entirely in
  // evaluateLoanApplication (lib/underwriting.ts) as hard stops, so we
  // don't duplicate them here — this avoids the two checks drifting out
  // of sync with each other.

  // 1. RUN THE AUTOMATED UNDERWRITING ALGORITHM
  const assessment = await evaluateLoanApplication(supabase, {
    borrowerId: user.id,
    principalAmount,
    termDays,
    purpose
  })

  const processingFee = 150.00
  const serviceFee = principalAmount * (assessment.serviceFeeRate / 100)
  const interestAmount = principalAmount * (assessment.interestRate / 100) * (termDays / 365)
  const totalRepayable = principalAmount + interestAmount + serviceFee + processingFee

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + termDays)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const schedule = assessment.approved
    ? generateInstallmentSchedule("", totalRepayable, termDays, numInstallments, new Date())
    : []

  const { data: loanId, error } = await supabase.rpc('create_loan_with_schedule_and_payout', {
    p_borrower_id:      user.id,
    p_principal:        principalAmount,
    p_term_days:        termDays,
    p_interest_rate:    assessment.interestRate,
    p_service_fee_rate: assessment.serviceFeeRate,
    p_processing_fee:   processingFee,
    p_total_interest:   interestAmount,
    p_total_repayable:  totalRepayable,
    p_status:           assessment.status,
    p_rejection_reason: assessment.rejectionReason ?? null,
    p_approved_at:      assessment.approved ? new Date().toISOString() : null,
    p_due_date:         assessment.approved ? dueDateStr : null,
    p_installments:     schedule,
    p_payout_method:         payoutMethod,
    p_payout_account_name:   payoutAccountName,
    p_payout_account_number: payoutAccountNumber,
  })

  if (error) throw new Error('Failed to create loan: ' + error.message)

  redirect(`/dashboard?loan_status=${assessment.status}`)
}