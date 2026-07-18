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

  const amount    = parseFloat(formData.get('amount') as string)
  const channel   = formData.get('channel') as string
  // Reference number field removed from UI for mockup simplicity —
  // auto-generate a placeholder so the column still has a value.
  const reference = `MOCK-${Date.now().toString(36).toUpperCase()}`

  // Verify the installment belongs to this borrower
  const { data: installment } = await supabase
    .from('loan_installments')
    .select('*, loans!inner(borrower_id, total_repayable)')
    .eq('id', installmentId)
    .eq('loans.borrower_id', user.id)
    .single()

  if (!installment) throw new Error('Installment not found')

  // Insert payment record
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

  if (paymentError) throw new Error('Payment recording failed')

  // Update installment status
  // NOTE: Number() coercion added — Supabase can return `numeric` columns as
  // strings depending on config, which would silently turn this into string
  // concatenation instead of addition without the explicit cast.
  const newAmountPaid = Number(installment.amount_paid) + amount
  const isPaid = newAmountPaid >= Number(installment.amount_due)

  const { data: updatedInstallment, error: installmentUpdateError } = await supabase
    .from('loan_installments')
    .update({
      amount_paid: newAmountPaid,
      status: isPaid ? 'paid' : installment.status
    })
    .eq('id', installmentId)
    .select()

  if (installmentUpdateError) {
    throw new Error('Installment update failed: ' + installmentUpdateError.message)
  }
  if (!updatedInstallment || updatedInstallment.length === 0) {
    // RLS silently blocked the update (0 rows matched) instead of erroring.
    throw new Error(
      'Installment status was not updated — this usually means a Row Level ' +
      'Security policy on loan_installments is blocking UPDATE for borrowers. ' +
      'Check Supabase RLS policies on that table.'
    )
  }

  // Check if ALL installments are paid → mark loan 'completed'
  if (isPaid) {
    const { data: remaining } = await supabase
      .from('loan_installments')
      .select('id')
      .eq('loan_id', loanId)
      .neq('status', 'paid')

    if (remaining?.length === 0) {
      const { data: updatedLoan, error: loanUpdateError } = await supabase
        .from('loans')
        .update({ status: 'completed' })
        .eq('id', loanId)
        .select()

      if (loanUpdateError) {
        throw new Error('Loan completion update failed: ' + loanUpdateError.message)
      }
      if (!updatedLoan || updatedLoan.length === 0) {
        // Same class of bug as the installment guard above — RLS is the
        // most likely cause. Surface it loudly instead of leaving the loan
        // stuck on 'approved' forever with 0 remaining balance.
        throw new Error(
          'Loan status was not updated to completed — this usually means a ' +
          'Row Level Security policy on loans is blocking UPDATE for ' +
          'borrowers. Check Supabase RLS policies on that table.'
        )
      }
    }
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath('/loans')
}