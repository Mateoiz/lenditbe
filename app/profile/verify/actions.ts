// app/profile/verify/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

function validateUpload(file: File, label: string) {
  if (file.size > MAX_FILE_SIZE)
    throw new Error(`${label} must be under 10MB`)
  if (!ALLOWED_MIME.includes(file.type))
    throw new Error(`${label} must be a JPG, PNG, HEIC, or WebP image`)
}

export async function submitVerification(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const idType   = formData.get('id_type') as string
  const idNumber = formData.get('id_number') as string
  const idFront  = formData.get('id_front') as File | null
  const selfie   = formData.get('selfie') as File | null

  if (!idType || !idNumber) throw new Error('ID type and number are required')
  if (!idFront || !selfie)  throw new Error('Both photos are required')

  // Validate file size and MIME types before sending over the network
  validateUpload(idFront, 'ID photo')
  validateUpload(selfie,  'Selfie')

  // Upload ID front
  const frontExt  = idFront.name.split('.').pop()
  const frontPath = `kyc/${user.id}/id_front_${Date.now()}.${frontExt}`
  const { error: frontErr } = await supabase.storage
    .from('kyc-documents')
    .upload(frontPath, idFront, { upsert: true })
  if (frontErr) throw new Error('Failed to upload ID photo: ' + frontErr.message)

  // Upload selfie
  const selfieExt  = selfie.name.split('.').pop()
  const selfiePath = `kyc/${user.id}/selfie_${Date.now()}.${selfieExt}`
  const { error: selfieErr } = await supabase.storage
    .from('kyc-documents')
    .upload(selfiePath, selfie, { upsert: true })
  if (selfieErr) throw new Error('Failed to upload selfie: ' + selfieErr.message)

  // Get public URLs
  const { data: frontUrl  } = supabase.storage.from('kyc-documents').getPublicUrl(frontPath)
  const { data: selfieUrl } = supabase.storage.from('kyc-documents').getPublicUrl(selfiePath)

  // Update borrower record
  const { error: updateErr } = await supabase
    .from('borrowers')
    .update({
      id_type:               idType,
      id_number:             idNumber,
      id_front_image_url:    frontUrl.publicUrl,
      id_selfie_url:         selfieUrl.publicUrl,
      data_privacy_consent:  true,
      credit_check_consent:  true,
      consent_given_at:      new Date().toISOString(),
      kyc_status:            'pending', // Admin reviews and flips to 'verified'
    })
    .eq('id', user.id)

  if (updateErr) throw new Error('Failed to save verification: ' + updateErr.message)
}