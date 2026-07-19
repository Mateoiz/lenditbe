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
      .select('disbursement_method, disbursement_account_name, disbursement_account_number, address_line, barangay, city, province, postal_code')
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
      savedAddress={{
        addressLine: borrower?.address_line ?? null,
        barangay: borrower?.barangay ?? null,
        city: borrower?.city ?? null,
        province: borrower?.province ?? null,
        postalCode: borrower?.postal_code ?? null,
      }}
      availableCredit={credit.availableCredit}
    />
  )
}