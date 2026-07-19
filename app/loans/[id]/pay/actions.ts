// app/loans/[id]/pay/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitPayment(
  loanId: string,
  installmentId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const amountStr = formData.get('amount') as string
  const amount = parseFloat(amountStr)
  const channel = formData.get('channel') as string
  const reference = `LND-${Date.now().toString(36).toUpperCase()}`

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Payment amount must be a valid number greater than zero.')
  }
  if (!channel) {
    throw new Error('Please select a payment method.')
  }

  const { data: installment, error: instError } = await supabase
    .from('loan_installments')
    .select('*, loans!inner(borrower_id, total_repayable)')
    .eq('id', installmentId)
    .eq('loans.borrower_id', user.id)
    .single()

  if (instError || !installment) {
    throw new Error('Installment not found or access denied.')
  }

  const { data: priorPayments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('loan_id', loanId)

  if (paymentsError) {
    throw new Error('Failed to verify payment history: ' + paymentsError.message)
  }

  const totalAlreadyPaid = (priorPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount), 
    0
  )
  const totalRepayable = Number(installment.loans.total_repayable)
  const outstanding = Math.max(0, Math.round((totalRepayable - totalAlreadyPaid) * 100) / 100)

  if (amount > outstanding + 0.01) {
    throw new Error(
      `Invalid payment amount. Your maximum outstanding balance is ₱${outstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`
    )
  }

  const { data: openInstallments, error: openInstallmentsError } = await supabase
    .from('loan_installments')
    .select('id, installment_number, amount_due, amount_paid, status')
    .eq('loan_id', loanId)
    .neq('status', 'paid')
    .order('installment_number', { ascending: true })

  if (openInstallmentsError) {
    throw new Error('Failed to load installment schedule: ' + openInstallmentsError.message)
  }

  const orderedTargets = (openInstallments ?? []).filter(
    (i) => i.installment_number >= installment.installment_number
  )

  if (orderedTargets.length === 0) {
    throw new Error('No unpaid installments remain on this loan.')
  }

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      loan_id: loanId,
      installment_id: installmentId,
      borrower_id: user.id,
      amount,
      channel,
      reference_number: reference
    })

  if (paymentError) {
    throw new Error('Payment recording failed: ' + paymentError.message)
  }

  let remainingAmount = amount

  for (const inst of orderedTargets) {
    if (remainingAmount <= 0) break

    const currentPaid = Number(inst.amount_paid)
    const due = Number(inst.amount_due)
    const owedOnThis = Math.max(0, due - currentPaid)
    
    if (owedOnThis <= 0) continue

    const applied = Math.min(remainingAmount, owedOnThis)
    const newAmountPaid = currentPaid + applied
    const isPaid = Math.round(newAmountPaid * 100) >= Math.round(due * 100)

    const { data: updatedInstallment, error: installmentUpdateError } = await supabase
      .from('loan_installments')
      .update({
        amount_paid: newAmountPaid,
        status: isPaid ? 'paid' : inst.status
      })
      .eq('id', inst.id)
      .select()

    if (installmentUpdateError) {
      throw new Error('Installment update failed: ' + installmentUpdateError.message)
    }
    
    if (!updatedInstallment || updatedInstallment.length === 0) {
      throw new Error(
        'Installment status was not updated — a Row Level Security (RLS) policy is likely blocking UPDATE for borrowers.'
      )
    }

    remainingAmount -= applied
  }

  const { data: stillOpen } = await supabase
    .from('loan_installments')
    .select('id')
    .eq('loan_id', loanId)
    .neq('status', 'paid')

  if (stillOpen?.length === 0) {
    const { error: completeLoanError } = await supabase
      .rpc('complete_loan_if_fully_paid', { p_loan_id: loanId })

    if (completeLoanError) {
      throw new Error('Loan completion failed: ' + completeLoanError.message)
    }
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath('/loans')

  return { success: true, reference, amount }
}