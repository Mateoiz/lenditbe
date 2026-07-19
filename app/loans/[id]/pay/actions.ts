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
  // Reference number field removed from UI for mockup simplicity 
  // auto-generate a placeholder so the column still has a value.
  const reference = `MOCK-${Date.now().toString(36).toUpperCase()}`

  // Verify the installment belongs to this borrower, and pull every
  // unpaid/partial installment on the loan (in order) so a payment that
  // exceeds this one installment's balance can roll forward instead of
  // vanishing into a single row.
  const { data: installment } = await supabase
    .from('loan_installments')
    .select('*, loans!inner(borrower_id, total_repayable)')
    .eq('id', installmentId)
    .eq('loans.borrower_id', user.id)
    .single()

  if (!installment) throw new Error('Installment not found')

  const { data: openInstallments, error: openInstallmentsError } = await supabase
    .from('loan_installments')
    .select('id, installment_number, amount_due, amount_paid, status')
    .eq('loan_id', loanId)
    .neq('status', 'paid')
    .order('installment_number', { ascending: true })

  if (openInstallmentsError) {
    throw new Error('Failed to load installment schedule: ' + openInstallmentsError.message)
  }

  // Start applying from the target installment onward (in case the caller
  // passed an earlier one than the borrower's actual next-due, we still
  // apply strictly in installment order so nothing gets skipped/double-paid).
  const orderedTargets = (openInstallments ?? []).filter(
    (i) => i.installment_number >= installment.installment_number
  )

  if (orderedTargets.length === 0) {
    throw new Error('No unpaid installments remain on this loan.')
  }

  // Insert payment record — one row for the whole amount, same as before.
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

  // Distribute the payment across installments in order, oldest first,
  // rolling any excess forward until it's exhausted.
  let remainingAmount = amount

  for (const inst of orderedTargets) {
    if (remainingAmount <= 0) break

    // NOTE: Number() coercion — Supabase can return `numeric` columns as
    // strings depending on config, which would silently turn this into
    // string concatenation instead of addition without the explicit cast.
    const currentPaid = Number(inst.amount_paid)
    const due = Number(inst.amount_due)
    const owedOnThis = Math.max(0, due - currentPaid)
    if (owedOnThis <= 0) continue

    const applied = Math.min(remainingAmount, owedOnThis)
    const newAmountPaid = currentPaid + applied
    const isPaid = newAmountPaid >= due

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
      // RLS silently blocked the update (0 rows matched) instead of erroring.
      throw new Error(
        'Installment status was not updated — this usually means a Row Level ' +
        'Security policy on loan_installments is blocking UPDATE for borrowers. ' +
        'Check Supabase RLS policies on that table.'
      )
    }

    remainingAmount -= applied
  }

  // Check if ALL installments are paid → mark loan 'completed'
  const { data: stillOpen } = await supabase
    .from('loan_installments')
    .select('id')
    .eq('loan_id', loanId)
    .neq('status', 'paid')

  if (stillOpen?.length === 0) {
    // Uses a SECURITY DEFINER RPC rather than a direct UPDATE, since
    // borrowers intentionally don't have a general UPDATE policy on
    // `loans` (that would let them rewrite principal_amount, interest_rate,
    // etc. from the client). The function re-verifies server-side that
    // every installment is paid before flipping status, and only allows
    // this one status transition.
    const { error: completeLoanError } = await supabase
      .rpc('complete_loan_if_fully_paid', { p_loan_id: loanId })

    if (completeLoanError) {
      throw new Error('Loan completion failed: ' + completeLoanError.message)
    }
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath('/loans')
}