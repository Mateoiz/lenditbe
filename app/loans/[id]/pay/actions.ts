// src/app/loans/[id]/pay/actions.ts
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
  const reference = formData.get('reference_number') as string

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
  const newAmountPaid = installment.amount_paid + amount
  const isPaid = newAmountPaid >= installment.amount_due

  await supabase
    .from('loan_installments')
    .update({
      amount_paid: newAmountPaid,
      status: isPaid ? 'paid' : installment.status
    })
    .eq('id', installmentId)

  // Check if ALL installments are paid → mark loan 'completed'
  if (isPaid) {
    const { data: remaining } = await supabase
      .from('loan_installments')
      .select('id')
      .eq('loan_id', loanId)
      .neq('status', 'paid')

    if (remaining?.length === 0) {
      await supabase
        .from('loans')
        .update({ status: 'completed' })
        .eq('id', loanId)
    }
  }

  revalidatePath(`/loans/${loanId}`)
}