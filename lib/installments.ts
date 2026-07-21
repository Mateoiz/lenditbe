// src/lib/installments.ts

export const MIN_INSTALLMENT_INTERVAL_DAYS = 7
export const LATE_FEE_RATE = 0.05 // 5% of the overdue installment, applied once, no grace period
export type InstallmentInsert = {
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  status: 'upcoming'
}

/**
 * Late fee is calculated live from the installment's own due_date —
 * always exactly in sync with the schedule, no batch job lag.
 * Applies only once due_date has passed and the installment isn't fully paid.
 */
/**
 * Given a term length in days, returns an array of valid installment counts
 * ensuring payments are spaced at least MIN_INSTALLMENT_INTERVAL_DAYS apart (capped at 6).
 */
export function getValidInstallmentCounts(termDays: number): number[] {
  const maxCount = Math.max(1, Math.floor(termDays / MIN_INSTALLMENT_INTERVAL_DAYS))
  const counts: number[] = []
  for (let n = 1; n <= Math.min(maxCount, 6); n++) {
    counts.push(n)
  }
  return counts
}

export function getLateFeeForInstallment(inst: {
  due_date: string
  amount_due: number
  amount_paid: number
}): number {
  const isUnpaid = Number(inst.amount_paid) < Number(inst.amount_due)
  const isPastDue = new Date(inst.due_date) < new Date(new Date().toDateString()) // compare at midnight, avoids TZ/time-of-day drift
  if (!isUnpaid || !isPastDue) return 0
  return Math.round(Number(inst.amount_due) * LATE_FEE_RATE * 100) / 100
}
/**
 * Generates an exact installment schedule honoring the user-selected installment count.
 * Automatically handles uneven date distributions and cent rounding reconciliation.
 */
export function generateInstallmentSchedule(
  loanId: string,
  principalAmount: number, // Retained in signature for interface compatibility/future interest breakdowns
  totalRepayable: number,
  termDays: number,
  numInstallments: number,
  startDate: Date
): InstallmentInsert[] {
  // 1. Defensive Validation: Ensure the requested installment count is mathematically valid
  const validCounts = getValidInstallmentCounts(termDays)
  if (!validCounts.includes(numInstallments)) {
    throw new Error(
      `Invalid installment count (${numInstallments}) for a ${termDays}-day term. Valid options: ${validCounts.join(', ')}.`
    )
  }

  const installments: InstallmentInsert[] = []

  // 2. Base calculation: round down to the nearest cent for standard installments
  const perInstallment = Math.round((totalRepayable / numInstallments) * 100) / 100
  let runningTotal = 0

  for (let i = 1; i <= numInstallments; i++) {
    // 3. Proportional Date Math: guarantees the final installment lands exactly on maturity date
    const dayOffset = Math.round((termDays / numInstallments) * i)
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + dayOffset)

    // 4. Cent Reconciliation: The final installment absorbs any floating-point rounding residue
    const amount = i === numInstallments
      ? Math.round((totalRepayable - runningTotal) * 100) / 100
      : perInstallment

    runningTotal = Math.round((runningTotal + amount) * 100) / 100

    installments.push({
      loan_id: loanId,
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      amount_due: amount,
      status: 'upcoming'
    })
  }

  return installments
}