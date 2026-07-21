// app/admin/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KycQueue from './KycQueue'
export const dynamic = 'force-dynamic'
export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase.from('admins').select('id, role').eq('id', user.id).maybeSingle()
  if (!admin) redirect('/dashboard')

const adminClient = createAdminClient()
  console.log('service role key loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  // Fetch pending KYC submissions (have uploaded docs)
const { data: pendingBorrowers, error: pendingError } = await adminClient
    .from('borrowers')
    .select('*')
    .eq('kyc_status', 'pending')
    .not('id_front_image_url', 'is', null)
    .order('updated_at', { ascending: true })

  console.log('pending error:', pendingError)
  console.log('pending count:', pendingBorrowers?.length)
  console.log('pending rows:', JSON.stringify(pendingBorrowers))

  // Fetch recently reviewed (last 10)
  const { data: reviewedBorrowers } = await adminClient
    .from('borrowers')
    .select('id, first_name, last_name, email, kyc_status, credit_limit, employment_type, updated_at')
    .in('kyc_status', ['verified', 'rejected'])
    .order('updated_at', { ascending: false })
    .limit(10)

  return (
    <KycQueue
      adminEmail={user.email ?? ''}
      adminRole={admin.role}
      pendingBorrowers={pendingBorrowers ?? []}
      reviewedBorrowers={reviewedBorrowers ?? []}
    />
  )
}