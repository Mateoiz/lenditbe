'use server'

import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

// ── Credit limit based on income (golden rule of lending) ──
function computeCreditLimit(
  employmentType: string,
  monthlyIncome: number,
  guardianMonthlyIncome: number
): number {
  const FLOOR = 1_000
  const CAP   = 50_000

  const rates: Record<string, { income: number; rate: number }> = {
    employed:       { income: monthlyIncome,         rate: 0.30 },
    business_owner: { income: monthlyIncome,         rate: 0.25 },
    self_employed:  { income: monthlyIncome,         rate: 0.20 },
    freelance:      { income: monthlyIncome,         rate: 0.15 },
    student:        { income: guardianMonthlyIncome, rate: 0.20 },
    unemployed:     { income: guardianMonthlyIncome, rate: 0.10 },
  }

  const entry = rates[employmentType]
  if (!entry || entry.income <= 0) return FLOOR

  const raw = Math.floor(entry.income * entry.rate)
  return Math.min(CAP, Math.max(FLOOR, raw))
}

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

    // ── Personal Info ──
    const firstName   = formData.get('first_name') as string
    const middleName  = formData.get('middle_name') as string
    const lastName    = formData.get('last_name') as string
    const suffix      = formData.get('suffix') as string
    const birthDate   = formData.get('birth_date') as string
    const gender      = formData.get('gender') as string
    const civilStatus = formData.get('civil_status') as string
    const mobile      = formData.get('mobile_number') as string

    // ── Address ──
    const addressLine = formData.get('address_line') as string
    const barangay    = formData.get('barangay') as string
    const city        = formData.get('city') as string
    const province    = formData.get('province') as string
    const postalCode  = formData.get('postal_code') as string

    // ── Employment ──
    const employmentType    = formData.get('employment_type') as string
    const employerName      = formData.get('employer_name') as string
    const monthlyIncome     = formData.get('monthly_income') as string
    const schoolName        = formData.get('school_name') as string
    const guardianName      = formData.get('guardian_name') as string
    const guardianMobile    = formData.get('guardian_mobile') as string
    const guardianIncome    = formData.get('guardian_monthly_income') as string

    // ── Disbursement ──
    const disbursementMethod  = formData.get('disbursement_method') as string
    const accountName         = formData.get('disbursement_account_name') as string
    const accountNumber       = formData.get('disbursement_account_number') as string

    // ── Document ──
    const idType   = formData.get('id_type') as string
    const idNumber = formData.get('id_number') as string

    // ── Files ──
    const idFront = formData.get('id_front') as File | null
    const idBack  = formData.get('id_back') as File | null
    const selfie  = formData.get('selfie') as File | null

    if (!firstName || !lastName || !birthDate || !gender || !civilStatus || !mobile)
      return { ok: false, error: 'Personal information is incomplete.' }
    if (!addressLine || !barangay || !city || !province || !postalCode)
      return { ok: false, error: 'Address information is incomplete.' }
    if (!employmentType)
      return { ok: false, error: 'Employment type is required.' }
    if (!disbursementMethod || !accountName || !accountNumber)
      return { ok: false, error: 'Disbursement details are incomplete.' }
    if (!idType || !idNumber)
      return { ok: false, error: 'ID type and number are required.' }
    if (!idFront || !selfie)
      return { ok: false, error: 'Both photos are required.' }

    const frontIssue = validateUpload(idFront, 'ID photo')
    if (frontIssue) return { ok: false, error: frontIssue }
    const selfieIssue = validateUpload(selfie, 'Selfie')
    if (selfieIssue) return { ok: false, error: selfieIssue }
    if (idBack && idBack.size > 0 && idBack.name !== 'undefined') {
      const backIssue = validateUpload(idBack, 'ID back photo')
      if (backIssue) return { ok: false, error: backIssue }
    }

    // ── Upload files ──
    const frontPath = `kyc/${user.id}/id_front_${Date.now()}.${idFront.name.split('.').pop()}`
    const { error: frontErr } = await supabase.storage.from('kyc-documents').upload(frontPath, idFront, { upsert: true })
    if (frontErr) return { ok: false, error: 'Failed to upload ID photo: ' + frontErr.message }

    let backPath: string | null = null
    if (idBack && idBack.size > 0 && idBack.name !== 'undefined') {
      backPath = `kyc/${user.id}/id_back_${Date.now()}.${idBack.name.split('.').pop()}`
      const { error: backErr } = await supabase.storage.from('kyc-documents').upload(backPath, idBack, { upsert: true })
      if (backErr) return { ok: false, error: 'Failed to upload ID back: ' + backErr.message }
    }

    const selfiePath = `kyc/${user.id}/selfie_${Date.now()}.${selfie.name.split('.').pop()}`
    const { error: selfieErr } = await supabase.storage.from('kyc-documents').upload(selfiePath, selfie, { upsert: true })
    if (selfieErr) return { ok: false, error: 'Failed to upload selfie: ' + selfieErr.message }

    // ── Update borrower row ──
    const isStudent = employmentType === 'student'

    const { data: updatedRows, error: updateErr } = await supabase
      .from('borrowers')
      .update({
        // Personal
        first_name:   firstName,
        middle_name:  middleName || null,
        last_name:    lastName,
        suffix:       suffix || null,
        birth_date:   birthDate,
        gender,
        civil_status: civilStatus,
        mobile_number: mobile,
        // Address
        address_line: addressLine,
        barangay,
        city,
        province,
        postal_code:  postalCode,
        // Employment
        employment_type:  employmentType,
        employer_name:    !isStudent ? (employerName || null) : null,
        monthly_income:   !isStudent && monthlyIncome ? parseFloat(monthlyIncome) : null,
        school_name:      isStudent ? (schoolName || null) : null,
        guardian_name:    isStudent ? (guardianName || null) : null,
        guardian_mobile:  isStudent ? (guardianMobile || null) : null,
        guardian_monthly_income: isStudent && guardianIncome ? parseFloat(guardianIncome) : null,
        // Disbursement
        disbursement_method:         disbursementMethod,
        disbursement_account_name:   accountName,
        disbursement_account_number: accountNumber,
        // Document
        id_type:   idType,
        id_number: idNumber,
        // Files
        id_front_image_url: frontPath,
        id_back_image_url:  backPath,
        id_selfie_url:      selfiePath,
        // Consent
        data_privacy_consent: true,
        credit_check_consent: true,
        consent_given_at:     new Date().toISOString(),
        credit_limit: computeCreditLimit(
          employmentType,
          !isStudent && monthlyIncome ? parseFloat(monthlyIncome) : 0,
          isStudent && guardianIncome ? parseFloat(guardianIncome) : 0,
        ),
        kyc_status:           'pending',
      })
      .eq('id', user.id)
      .select()

    if (updateErr) return { ok: false, error: 'Failed to save verification: ' + updateErr.message }
    
    // Guard against silent RLS failures where update succeeds but 0 rows were affected
    if (!updatedRows || updatedRows.length === 0) {
      return { ok: false, error: 'Failed to update user profile. Please ensure your account exists and permissions are correct.' }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unexpected error during verification.' }
  }
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60

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
      const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
      isAdmin = !!admin
    }
    if (!isSelf && !isAdmin) return { ok: false, error: 'Not authorized' }

    const { data: borrower, error: borrowerErr } = await supabase
      .from('borrowers').select('id_front_image_url, id_back_image_url, id_selfie_url')
      .eq('id', borrowerId).maybeSingle()

    if (borrowerErr) return { ok: false, error: borrowerErr.message }
    if (!borrower)   return { ok: false, error: 'Borrower not found' }

    async function sign(path: string | null): Promise<string | null> {
      if (!path) return null
      const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
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
    return { ok: false, error: err?.message ?? 'Unexpected error.' }
  }
}