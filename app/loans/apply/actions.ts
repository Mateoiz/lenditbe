// app/loans/apply/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getValidInstallmentCounts, MIN_INSTALLMENT_INTERVAL_DAYS } from '@/lib/installments'

interface EligibilityResult {
  eligible: boolean
  reason: string | null
}

function checkEligibility(params: {
  requestedAmount: number
  creditLimit: number
  kycStatus: string
  activeLoanCount: number
  hasOverdueLoan: boolean
}): EligibilityResult {
  const { requestedAmount, creditLimit, kycStatus, activeLoanCount, hasOverdueLoan } = params

  if (kycStatus !== 'verified') {
    return { eligible: false, reason: 'Your identity verification is not yet complete.' }
  }
  if (hasOverdueLoan) {
    return { eligible: false, reason: 'You have an overdue loan that must be settled first.' }
  }
  if (activeLoanCount >= 2) {
    return { eligible: false, reason: 'You already have the maximum number of active loans.' }
  }
  if (requestedAmount > creditLimit) {
    return { eligible: false, reason: 'Requested amount exceeds your current credit limit.' }
  }
  if (requestedAmount < 1000 || requestedAmount > 50000) {
    return { eligible: false, reason: 'Loan amount must be between ₱1,000 and ₱50,000.' }
  }

  return { eligible: true, reason: null }
}

export async function submitLoanApplication(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const principalAmount = Number(formData.get('principal_amount'))
  const termDays = Number(formData.get('term_days'))
  const numInstallments = Number(formData.get('num_installments'))
  const purpose = String(formData.get('purpose') ?? '')
  const financingType = formData.get('financing_type') as string | null
  const itemName = formData.get('item_name') as string | null
  const isFinancing = financingType === 'item'

  const validCounts = getValidInstallmentCounts(termDays)
  if (!validCounts.includes(numInstallments)) {
    throw new Error('Selected installment count is not valid for this loan term.')
  }

  let payoutMethod: string | null = null
  let payoutAccountName: string | null = null
  let payoutAccountNumber: string | null = null

  let shippingAddressLine: string | null = null
  let shippingBarangay: string | null = null
  let shippingCity: string | null = null
  let shippingProvince: string | null = null
  let shippingPostalCode: string | null = null

  if (isFinancing) {
    shippingAddressLine = String(formData.get('shipping_address_line') ?? '')
    shippingBarangay = String(formData.get('shipping_barangay') ?? '')
    shippingCity = String(formData.get('shipping_city') ?? '')
    shippingProvince = String(formData.get('shipping_province') ?? '')
    shippingPostalCode = String(formData.get('shipping_postal_code') ?? '')

    if (!shippingAddressLine || !shippingBarangay || !shippingCity || !shippingProvince || !shippingPostalCode) {
      throw new Error('Complete shipping address is required for financed items.')
    }
  } else {
    payoutMethod = String(formData.get('payout_method') ?? '')
    payoutAccountName = String(formData.get('payout_account_name') ?? '')
    payoutAccountNumber = String(formData.get('payout_account_number') ?? '')

    if (!payoutMethod || !payoutAccountName || !payoutAccountNumber) {
      throw new Error('Payout details are required.')
    }
  }

  const { data: borrower, error: borrowerError } = await supabase
    .from('borrowers')
    .select('kyc_status, credit_limit')
    .eq('id', user.id)
    .maybeSingle()

  if (borrowerError || !borrower) {
    throw new Error('Borrower profile not found. Please complete registration first.')
  }

  const { data: existingLoans } = await supabase
    .from('loans')
    .select('status')
    .eq('borrower_id', user.id)

  const activeLoanCount = (existingLoans ?? []).filter(
    l => ['active', 'disbursed'].includes(l.status)
  ).length
  const hasOverdueLoan = (existingLoans ?? []).some(l => l.status === 'overdue')

  const { eligible, reason } = checkEligibility({
    requestedAmount: principalAmount,
    creditLimit: Number(borrower.credit_limit),
    kycStatus: borrower.kyc_status,
    activeLoanCount,
    hasOverdueLoan,
  })

  if (isFinancing && eligible && principalAmount > Number(borrower.credit_limit)) {
    throw new Error('This item exceeds your available credit.')
  }

const interestRate = 5 // stored as a whole percentage (5 = 5%), not a decimal
  const serviceFeeRate = 2 // same convention
  const totalInterest = principalAmount * (interestRate / 100)
  const processingFee = principalAmount * (serviceFeeRate / 100)
  const totalRepayable = principalAmount + totalInterest + processingFee

  const { data: loan, error: insertError } = await supabase
    .from('loans')
    .insert({
      borrower_id: user.id,
      principal_amount: principalAmount,
      term_days: termDays,
      interest_rate: interestRate,
      service_fee_rate: serviceFeeRate,
      processing_fee: processingFee,
      total_interest: totalInterest,
      total_repayable: totalRepayable,
      status: eligible ? 'approved' : 'rejected',
      approved_at: eligible ? new Date().toISOString() : null,
      rejection_reason: eligible ? null : reason,
      due_date: eligible
        ? new Date(Date.now() + termDays * 86400000).toISOString().slice(0, 10)
        : null,
      payout_method: payoutMethod,
      payout_account_name: payoutAccountName,
      payout_account_number: payoutAccountNumber,
      shipping_address_line: shippingAddressLine,
      shipping_barangay: shippingBarangay,
      shipping_city: shippingCity,
      shipping_province: shippingProvince,
      shipping_postal_code: shippingPostalCode,
    })
    .select('id')
    .single()

  if (insertError || !loan) {
    throw new Error('Could not submit your loan application. Please try again.')
  }

  if (eligible) {
    const { error: disburseError } = await supabase
      .from('loans')
      .update({ status: 'disbursed', disbursed_at: new Date().toISOString() })
      .eq('id', loan.id)

    if (disburseError) {
      throw new Error('Loan approved but disbursement failed. Please contact support.')
    }

    await generateInstallmentSchedule(supabase, loan.id, totalRepayable, termDays, numInstallments)
  }

  redirect(`/loans/${loan.id}`)
}

async function generateInstallmentSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  loanId: string,
  totalRepayable: number,
  termDays: number,
  numInstallments: number
) {
  const installmentAmount = Math.round((totalRepayable / numInstallments) * 100) / 100
  const today = new Date()

  const installments = Array.from({ length: numInstallments }, (_, i) => {
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + Math.round(((i + 1) * termDays) / numInstallments))

    return {
      loan_id: loanId,
      installment_number: i + 1,
      amount_due: installmentAmount,
      amount_paid: 0,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'upcoming' as const,
    }
  })

  const { error } = await supabase.from('loan_installments').insert(installments)

  if (error) {
    throw new Error('Failed to generate installment schedule: ' + error.message)
  }
}