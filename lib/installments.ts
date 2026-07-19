// src/lib/installments.ts
// Plain shared module — NOT a server action file. Both the client apply
// page and the server action import from here, so the valid-count logic
// only lives in one place.

export const MIN_INSTALLMENT_INTERVAL_DAYS = 7

export type InstallmentInsert = {
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  status: 'upcoming'
}

// Given a term length, what installment counts actually make sense.
// Used to validate the borrower's choice server-side and to build the
// options list shown on the form.
export function getValidInstallmentCounts(termDays: number): number[] {
  const maxCount = Math.max(1, Math.floor(termDays / MIN_INSTALLMENT_INTERVAL_DAYS))
  const counts: number[] = []
  for (let n = 1; n <= Math.min(maxCount, 6); n++) {
    counts.push(n)
  }
  return counts
}

export function generateInstallmentSchedule(
  loanId: string,
  principalAmount: number,
  totalRepayable: number,
  termDays: number,
  startDate: Date
): InstallmentInsert[] {
  const installments: InstallmentInsert[] = []

  // Determine frequency
  const frequency =
    termDays <= 14  ? 'single'    :  // bullet payment
    termDays <= 31  ? 'biweekly'  :  // 2 payments
    termDays <= 90  ? 'monthly'   :  // monthly
                      'monthly'      // monthly default

  if (frequency === 'single') {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + termDays)
    return [{
      loan_id: loanId,
      installment_number: 1,
      due_date: dueDate.toISOString().split('T')[0],
      amount_due: totalRepayable,
      status: 'upcoming'
    }]
  }

  const intervalDays = frequency === 'biweekly' ? 14 : 30
  const count = Math.floor(termDays / intervalDays)
  const perInstallment = parseFloat((totalRepayable / count).toFixed(2))
  let runningTotal = 0

  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + intervalDays * i)

    // Last installment absorbs rounding difference
    const amount = i === count
      ? parseFloat((totalRepayable - runningTotal).toFixed(2))
      : perInstallment

    runningTotal += perInstallment
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