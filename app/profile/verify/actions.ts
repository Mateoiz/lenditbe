// app/profile/verify/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

function validateUpload(file: File, label: string): string | null {
  if (file.size > MAX_FILE_SIZE) return `${label} must be under 10MB`
  if (!ALLOWED_MIME.includes(file.type)) return `${label} must be a JPG, PNG, HEIC, or WebP image`
  return null
}

export async function submitVerification(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    const idType   = formData.get('id_type') as string
    const idNumber = formData.get('id_number') as string
    const idFront  = formData.get('id_front') as File | null
    const idBack   = formData.get('id_back') as File | null
    const selfie   = formData.get('selfie') as File | null

    if (!idType || !idNumber) return { ok: false, error: 'ID type and number are required' }
    if (!idFront || !selfie)  return { ok: false, error: 'Both photos are required' }

    const frontIssue = validateUpload(idFront, 'ID photo')
    if (frontIssue) return { ok: false, error: frontIssue }

    const selfieIssue = validateUpload(selfie, 'Selfie')
    if (selfieIssue) return { ok: false, error: selfieIssue }

    if (idBack) {
      const backIssue = validateUpload(idBack, 'ID back photo')
      if (backIssue) return { ok: false, error: backIssue }
    }

    // Upload ID front
    const frontExt  = idFront.name.split('.').pop()
    const frontPath = `kyc/${user.id}/id_front_${Date.now()}.${frontExt}`
    const { error: frontErr } = await supabase.storage
      .from('kyc-documents')
      .upload(frontPath, idFront, { upsert: true })
    if (frontErr) return { ok: false, error: 'Failed to upload ID photo: ' + frontErr.message }

    // Upload ID back (optional, depends on document type)
    let backPath: string | null = null
    if (idBack) {
      const backExt = idBack.name.split('.').pop()
      backPath = `kyc/${user.id}/id_back_${Date.now()}.${backExt}`
      const { error: backErr } = await supabase.storage
        .from('kyc-documents')
        .upload(backPath, idBack, { upsert: true })
      if (backErr) return { ok: false, error: 'Failed to upload ID back photo: ' + backErr.message }
    }

    // Upload selfie
    const selfieExt  = selfie.name.split('.').pop()
    const selfiePath = `kyc/${user.id}/selfie_${Date.now()}.${selfieExt}`
    const { error: selfieErr } = await supabase.storage
      .from('kyc-documents')
      .upload(selfiePath, selfie, { upsert: true })
    if (selfieErr) return { ok: false, error: 'Failed to upload selfie: ' + selfieErr.message }

    // Store STORAGE PATHS, not public URLs. The bucket is private — actual
    // viewing access happens later via createSignedUrl() (see getKycDocumentUrls
    // below), scoped to admins or the owning borrower, and short-lived.
    const { error: updateErr } = await supabase
      .from('borrowers')
      .update({
        id_type:              idType,
        id_number:            idNumber,
        id_front_image_url:   frontPath,
        id_back_image_url:    backPath,
        id_selfie_url:        selfiePath,
        data_privacy_consent: true,
        credit_check_consent: true,
        consent_given_at:     new Date().toISOString(),
        kyc_status:           'pending', // Admin reviews and flips to 'verified'
      })
      .eq('id', user.id)

    if (updateErr) return { ok: false, error: 'Failed to save verification: ' + updateErr.message }

    return { ok: true }
  } catch (err: any) {
    // Catch-all so an unexpected exception never falls through as an opaque digest
    return { ok: false, error: err?.message ?? 'Unexpected error during verification.' }
  }
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

/**
 * Generates short-lived signed URLs for a borrower's KYC documents.
 * Callable by:
 *  - the borrower themselves (viewing their own submitted docs), or
 *  - an admin (reviewing a borrower's docs for verification)
 * RLS on `borrowers`/`admins` isn't enough on its own here — this function
 * enforces the same rule in application code before touching storage.
 */
export async function getKycDocumentUrls(
  borrowerId: string
): Promise<
  | { ok: true; urls: { front: string | null; back: string | null; selfie: string | null } }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    const isSelf = user.id === borrowerId
    let isAdmin = false
    if (!isSelf) {
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      isAdmin = !!admin
    }

    if (!isSelf && !isAdmin) {
      return { ok: false, error: 'Not authorized to view these documents' }
    }

    const { data: borrower, error: borrowerErr } = await supabase
      .from('borrowers')
      .select('id_front_image_url, id_back_image_url, id_selfie_url')
      .eq('id', borrowerId)
      .maybeSingle()

    if (borrowerErr) return { ok: false, error: 'Failed to load borrower record: ' + borrowerErr.message }
    if (!borrower) return { ok: false, error: 'Borrower not found' }

    async function sign(path: string | null): Promise<string | null> {
      if (!path) return null
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
      if (error || !data) return null
      return data.signedUrl
    }

    const [front, back, selfie] = await Promise.all([
      sign(borrower.id_front_image_url),
      sign(borrower.id_back_image_url),
      sign(borrower.id_selfie_url),
    ])

    return { ok: true, urls: { front, back, selfie } }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unexpected error fetching documents.' }
  }
}