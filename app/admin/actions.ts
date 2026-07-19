'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: admin } = await supabase.from('admins').select('id, role').eq('id', user.id).maybeSingle()
  if (!admin) throw new Error('Not authorized')
  return { user, admin }
}

export async function approveKyc(
  borrowerId: string,
  creditLimit: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('borrowers')
      .update({
        kyc_status: 'verified',
        credit_limit: creditLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', borrowerId)

    if (error) return { ok: false, error: error.message }
    revalidatePath('/admin')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unexpected error' }
  }
}

export async function rejectKyc(
  borrowerId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin()
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('borrowers')
      .update({
        kyc_status: 'rejected',
        credit_limit: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', borrowerId)

    if (error) return { ok: false, error: error.message }
    revalidatePath('/admin')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unexpected error' }
  }
}

export async function getKycDocUrls(borrowerId: string): Promise<{
  ok: true; urls: { front: string | null; back: string | null; selfie: string | null }
} | { ok: false; error: string }> {
  try {
    await requireAdmin()
    const adminClient = createAdminClient()

    const { data: borrower, error } = await adminClient
      .from('borrowers')
      .select('id_front_image_url, id_back_image_url, id_selfie_url')
      .eq('id', borrowerId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message }
    if (!borrower) return { ok: false, error: 'Borrower not found' }

    async function sign(path: string | null): Promise<string | null> {
      if (!path) return null
      const { data, error } = await adminClient.storage
        .from('kyc-documents')
        .createSignedUrl(path, 60 * 60)
      return error || !data ? null : data.signedUrl
    }

    const [front, back, selfie] = await Promise.all([
      sign(borrower.id_front_image_url),
      sign(borrower.id_back_image_url),
      sign(borrower.id_selfie_url),
    ])

    return { ok: true, urls: { front, back, selfie } }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unexpected error' }
  }
}