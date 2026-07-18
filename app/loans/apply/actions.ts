// app/loans/apply/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { evaluateLoanApplication } from '@/lib/underwriting'
import { redirect } from 'next/navigation'
import { LoanApplicationSchema } from '@/lib/schemas'

// Helper: Generates equal installment schedules and prevents centavo rounding errors
function generateInstallmentSchedule(
  loanId: string,
  principalAmount: number,
  totalRepayable: number,
  termDays: number,
  startDate: Date
) {
  // Determine installment interval (e.g., bi-weekly every 15 days, or monthly every 30 days)
  let numInstallments = 1
  let intervalDays = termDays

  if (termDays === 30) {
    numInstallments = 2 // 15th and 30th payday cycle
    intervalDays = 15
  } else if (termDays > 30 && termDays % 30 === 0) {
    numInstallments = termDays / 30 // Monthly cycle
    intervalDays = 30
  } else if (termDays > 14 && termDays % 14 === 0) {
    numInstallments = termDays / 14 // Bi-weekly cycle
    intervalDays = 14
  }

  const baseInstallmentAmount = Math.floor((totalRepayable / numInstallments) * 100) / 100
  const schedule = []
  let accumulatedAmount = 0

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + (intervalDays * i))

    // Assign remainder centavos to the final installment so totals match 100%
    const isLast = i === numInstallments
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

  // RATE LIMIT GUARD: Prevent duplicate submissions or rapid application spam
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: recentApplication } = await supabase
    .from('loans')
    .select('id')
    .eq('borrower_id', user.id)
    .gte('created_at', fiveMinutesAgo)
    .maybeSingle()

  if (recentApplication) {
    throw new Error('Please wait a few minutes before submitting another application.')
  }

  // CREDIT EXPOSURE GUARD: cap new loan by remaining available credit.
  // Available credit = credit_limit - principal of all loans currently
  // counted as exposure (approved, disbursed, active, overdue). Loans that
  // are completed/rejected/pending don't count against exposure — pending
  // hasn't been extended yet, and completed/rejected are settled.
  const { data: openLoans } = await supabase
    .from('loans')
    .select('principal_amount')
    .eq('borrower_id', user.id)
    .in('status', ['approved', 'disbursed', 'active', 'overdue'])

  const { data: borrowerRow } = await supabase
    .from('borrowers')
    .select('credit_limit')
    .eq('id', user.id)
    .single()

  const outstandingPrincipal = (openLoans ?? []).reduce(
    (sum, l) => sum + Number(l.principal_amount), 0
  )
  const creditLimit = Number(borrowerRow?.credit_limit ?? 0)
  const availableCredit = Math.max(0, creditLimit - outstandingPrincipal)

  if (principalAmount > availableCredit) {
    const outstandingStr = outstandingPrincipal.toLocaleString('en-PH')
    const limitStr = creditLimit.toLocaleString('en-PH')
    const availableStr = availableCredit.toLocaleString('en-PH')

    throw new Error(
      outstandingPrincipal > 0
        ? `This exceeds your available credit. You have ₱${outstandingStr} outstanding ` +
          `against a ₱${limitStr} limit — your maximum new loan right now is ₱${availableStr}.`
        : `This exceeds your credit limit of ₱${limitStr}.`
    )
  }

  // 1. RUN THE AUTOMATED UNDERWRITING ALGORITHM
  const assessment = await evaluateLoanApplication(supabase, {
    borrowerId: user.id,
    principalAmount,
    termDays,
    purpose
  })

  // Calculate fees and totals
  const processingFee = 150.00 // Flat processing fee
  const serviceFee = principalAmount * (assessment.serviceFeeRate / 100)
  const interestAmount = principalAmount * (assessment.interestRate / 100) * (termDays / 365)
  const totalRepayable = principalAmount + interestAmount + serviceFee + processingFee

  // Calculate Due Date
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + termDays)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  // 2. GENERATE SCHEDULE & CALL ATOMIC RPC
  // Pass "" for loanId since Postgres will assign the newly generated UUID inside the transaction
  const schedule = assessment.approved
    ? generateInstallmentSchedule("", principalAmount, totalRepayable, termDays, new Date())
    : []

  const { data: loanId, error } = await supabase.rpc('create_loan_with_schedule', {
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
  })

  if (error) throw new Error('Failed to create loan: ' + error.message)

  // Redirect borrower to view their instant result
  redirect(`/dashboard?loan_status=${assessment.status}`)
}