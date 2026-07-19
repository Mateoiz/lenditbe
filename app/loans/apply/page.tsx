// app/loans/apply/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAvailableCredit } from '@/lib/credit'
import ApplyForm from './ApplyForm'

export default async function LoanApplyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: borrower }, credit] = await Promise.all([
    supabase
      .from('borrowers')
      .select('disbursement_method, disbursement_account_name, disbursement_account_number')
      .eq('id', user.id)
      .maybeSingle(),
    getAvailableCredit(supabase, user.id),
  ])

  return (
    <ApplyForm
      savedPayout={{
        method: borrower?.disbursement_method ?? null,
        accountName: borrower?.disbursement_account_name ?? null,
        accountNumber: borrower?.disbursement_account_number ?? null,
      }}
      availableCredit={credit.availableCredit}
    />
  )
}