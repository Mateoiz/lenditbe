// app/profile/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Whitelisted editable fields, grouped by section. Identity/KYC fields
// (name, birth_date, id_type, id_number, id images) are intentionally
// excluded — once set, they require the /profile/verify re-KYC flow,
// not a plain profile edit, since they're fraud-sensitive.
const SECTION_FIELDS: Record<string, string[]> = {
  contact: ['mobile_number', 'address_line', 'barangay', 'city', 'province', 'postal_code'],
  employment: ['employment_type', 'employer_name', 'monthly_income'],
  disbursement: ['disbursement_method', 'disbursement_account_name', 'disbursement_account_number'],
  guardian: ['guardian_name', 'guardian_mobile', 'guardian_monthly_income'],
}

export async function updateProfileSection(section: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const allowedFields = SECTION_FIELDS[section]
  if (!allowedFields) throw new Error('Unknown profile section')

  const updates: Record<string, any> = {}
  for (const field of allowedFields) {
    if (formData.has(field)) {
      const raw = formData.get(field) as string
      updates[field] = field.includes('income') ? (raw === '' ? null : Number(raw)) : raw
    }
  }

  if (Object.keys(updates).length === 0) return

  const { data: updated, error } = await supabase
    .from('borrowers')
    .update(updates)
    .eq('id', user.id)
    .select()

  if (error) throw new Error('Failed to update profile: ' + error.message)
  if (!updated || updated.length === 0) {
    throw new Error(
      'Profile was not updated — this usually means a Row Level Security ' +
      'policy on borrowers is blocking UPDATE. Check Supabase RLS policies on that table.'
    )
  }

  revalidatePath('/profile')
}