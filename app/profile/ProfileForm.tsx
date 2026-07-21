// app/profile/ProfileForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { updateProfileSection } from './actions'

type Borrower = {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  birth_date: string
  gender: string | null
  civil_status: string | null
  mobile_number: string
  address_line: string | null
  barangay: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  region: string | null
  id_type: string | null
  id_number: string | null
  id_front_image_url: string | null
  id_selfie_url: string | null
  employment_type: string | null
  employer_name: string | null
  monthly_income: number | null
  disbursement_method: string | null
  disbursement_account_name: string | null
  disbursement_account_number: string | null
  guardian_name: string | null
  guardian_mobile: string | null
  guardian_monthly_income: number | null
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

function peso(n: number | null) {
  if (n === null || n === undefined) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function Section({
  title,
  section,
  fields,
  editable,
  onSaved,
  error,
  isPending,
  onSubmit,
}: {
  title: string
  section: string
  fields: { label: string; name: string; value: string; type?: string; options?: string[] }[]
  editable: boolean
  onSaved: () => void
  error: string | null
  isPending: boolean
  onSubmit: (section: string, formData: FormData) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(section, formData)
    setIsEditing(false)
  }

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="section-title">{title}</span>
        {editable && !isEditing && (
          <button type="button" className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}
        {!editable && (
          <span className="lock-badge">
            <LockIcon /> Locked
          </span>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          {fields.map(f => (
            <div className="field-row" key={f.name}>
              <span className="field-label">{f.label}</span>
              {f.options ? (
                <select name={f.name} defaultValue={f.value} className="field-input">
                  {f.options.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  defaultValue={f.value}
                  type={f.type ?? 'text'}
                  className="field-input"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          {fields.map(f => (
            <div className="field-row" key={f.name}>
              <span className="field-label">{f.label}</span>
              <span className="field-value">{f.value || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs mt-3" style={{ color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  )
}

export default function ProfileForm({ borrower, userEmail, idFrontUrl, idSelfieUrl }: {
  borrower: Borrower
  userEmail: string
  idFrontUrl: string | null
  idSelfieUrl: string | null
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isStudent = borrower.employment_type === 'student'

  function handleSubmit(section: string, formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateProfileSection(section, formData)
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong. Please try again.')
      }
    })
  }

  const fullName = [borrower.first_name, borrower.middle_name, borrower.last_name, borrower.suffix]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {/* Identity & KYC — locked */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="section-title">Identity & ID</span>
          <span className="lock-badge">
            <LockIcon /> Locked
          </span>
        </div>
        <div className="field-row">
          <span className="field-label">Full name</span>
          <span className="field-value">{fullName}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Birth date</span>
          <span className="field-value">{formatDate(borrower.birth_date)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Email</span>
          <span className="field-value">{userEmail}</span>
        </div>
        <div className="field-row">
          <span className="field-label">ID type</span>
          <span className="field-value" style={{ textTransform: 'capitalize' }}>
            {borrower.id_type?.replace(/_/g, ' ') || '—'}
          </span>
        </div>
        <div className="field-row">
          <span className="field-label">ID number</span>
          <span className="field-value">
            {borrower.id_number ? `••••${borrower.id_number.slice(-4)}` : '—'}
          </span>
        </div>
{(idFrontUrl || idSelfieUrl) && (
          <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {idFrontUrl && (
              <img
                src={idFrontUrl}
                alt="ID front"
                className="rounded-lg object-cover"
                style={{ width: 96, height: 60, border: '1px solid var(--line-md)' }}
              />
            )}
            {idSelfieUrl && (
              <img
                src={idSelfieUrl}
                alt="Verification selfie"
                className="rounded-lg object-cover"
                style={{ width: 60, height: 60, border: '1px solid var(--line-md)' }}
              />
            )}
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: 'var(--ink-4)' }}>
          These details are locked after verification. Contact support if any of this needs to change.
        </p>
      </div>

      {/* Contact & address — editable */}
      <Section
        title="Contact & address"
        section="contact"
        editable
        isPending={isPending}
        error={error}
        onSaved={() => {}}
        onSubmit={handleSubmit}
fields={[
          { label: 'Mobile number', name: 'mobile_number', value: borrower.mobile_number },
          { label: 'Address', name: 'address_line', value: borrower.address_line ?? '' },
          { label: 'Region', name: 'region', value: borrower.region ?? '' },
          { label: 'City', name: 'city', value: borrower.city ?? '' },
          { label: 'Barangay', name: 'barangay', value: borrower.barangay ?? '' },
          { label: 'Province', name: 'province', value: borrower.province ?? '' },
          { label: 'Postal code', name: 'postal_code', value: borrower.postal_code ?? '' },
        ]}
      />

      {/* Employment — editable */}
      <Section
        title="Employment"
        section="employment"
        editable
        isPending={isPending}
        error={error}
        onSaved={() => {}}
        onSubmit={handleSubmit}
        fields={[
          {
            label: 'Employment type',
            name: 'employment_type',
            value: borrower.employment_type ?? '',
            options: ['employed', 'self_employed', 'freelance', 'business_owner', 'unemployed', 'student'],
          },
          { label: 'Employer name', name: 'employer_name', value: borrower.employer_name ?? '' },
          {
            label: 'Monthly income',
            name: 'monthly_income',
            value: borrower.monthly_income?.toString() ?? '',
            type: 'number',
          },
        ]}
      />

      {/* Disbursement — editable */}
      <Section
        title="Payout details"
        section="disbursement"
        editable
        isPending={isPending}
        error={error}
        onSaved={() => {}}
        onSubmit={handleSubmit}
        fields={[
          {
            label: 'Method',
            name: 'disbursement_method',
            value: borrower.disbursement_method ?? '',
            options: ['gcash', 'maya', 'bank_transfer', 'cash_pickup'],
          },
          { label: 'Account name', name: 'disbursement_account_name', value: borrower.disbursement_account_name ?? '' },
          { label: 'Account number', name: 'disbursement_account_number', value: borrower.disbursement_account_number ?? '' },
        ]}
      />

      {/* Guardian — students only, editable */}
      {isStudent && (
        <Section
          title="Guardian details"
          section="guardian"
          editable
          isPending={isPending}
          error={error}
          onSaved={() => {}}
          onSubmit={handleSubmit}
          fields={[
            { label: 'Guardian name', name: 'guardian_name', value: borrower.guardian_name ?? '' },
            { label: 'Guardian mobile', name: 'guardian_mobile', value: borrower.guardian_mobile ?? '' },
            {
              label: 'Guardian income',
              name: 'guardian_monthly_income',
              value: borrower.guardian_monthly_income?.toString() ?? '',
              type: 'number',
            },
          ]}
        />
      )}
    </>
  )
}