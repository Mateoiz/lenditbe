import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VerifyForm from './VerifyForm'

export default async function VerifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: borrower } = await supabase
    .from('borrowers')
    .select('kyc_status, id_type, id_number, data_privacy_consent, credit_check_consent')
    .eq('id', user.id)
    .maybeSingle()

  // Already verified — nothing to do here
  if (borrower?.kyc_status === 'verified') redirect('/dashboard')

  return <VerifyForm currentStatus={borrower?.kyc_status ?? 'pending'} />
}