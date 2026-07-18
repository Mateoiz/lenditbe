// src/lib/installments.ts
type InstallmentInsert = {
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  status: 'upcoming'
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