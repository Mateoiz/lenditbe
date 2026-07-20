// app/loans/apply/ApplyForm.tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { submitLoanApplication } from './actions'
import { getValidInstallmentCounts, MIN_INSTALLMENT_INTERVAL_DAYS } from '@/lib/installments'

const TERM_OPTIONS = [
  { days: 15, label: '15 days' },
  { days: 30, label: '30 days' },
  { days: 45, label: '45 days' },
  { days: 60, label: '60 days' },
]

const PURPOSE_OPTIONS = [
  'Emergency expense',
  'Medical bills',
  'Education / tuition',
  'Business capital',
  'Bills payment',
  'Other',
]

const PAYOUT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash_pickup', label: 'Cash pickup' },
]

function payoutLabel(method: string | null) {
  return PAYOUT_METHOD_OPTIONS.find(o => o.value === method)?.label ?? method ?? '—'
}

type SavedPayout = {
  method: string | null
  accountName: string | null
  accountNumber: string | null
}

type SavedAddress = {
  addressLine: string | null
  barangay: string | null
  city: string | null
  province: string | null
  postalCode: string | null
}

export default function ApplyForm({
  savedPayout,
  savedAddress,
  availableCredit,
}: {
  savedPayout: SavedPayout
  savedAddress: SavedAddress
  availableCredit: number
}) {
  const searchParams = useSearchParams()
  const isFinancing = searchParams.get('financing') === '1'
  const itemName = searchParams.get('item')
  const prefillAmount = searchParams.get('amount')
  const prefillPurpose = searchParams.get('purpose')
  const prefillTermDays = searchParams.get('term_days')
  const prefillInstallments = searchParams.get('num_installments')
  const isPrefilled = !!(prefillAmount && prefillTermDays)

  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [termDays, setTermDays] = useState<number | ''>(prefillTermDays ? Number(prefillTermDays) : '')
  const [numInstallments, setNumInstallments] = useState<number | ''>(prefillInstallments ? Number(prefillInstallments) : '')
  const [principalAmount, setPrincipalAmount] = useState<number | ''>(prefillAmount ? Number(prefillAmount) : '')

  const exceedsCredit = isFinancing && typeof principalAmount === 'number' && principalAmount > availableCredit

  // payout is irrelevant for financing — money never touches the borrower
  const hasSavedPayout = !isFinancing && !!(savedPayout.method && savedPayout.accountName && savedPayout.accountNumber)
  const [useCustomPayout, setUseCustomPayout] = useState(!hasSavedPayout && !isFinancing)

  const validCounts = useMemo(
    () => (termDays ? getValidInstallmentCounts(Number(termDays)) : []),
    [termDays]
  )

  function handleTermChange(value: string) {
    const days = value ? parseInt(value, 10) : ''
    setTermDays(days)
    // Reset installment choice whenever the term changes, since a count
    // valid for one term can be invalid for another.
    setNumInstallments('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await submitLoanApplication(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith?.('NEXT_REDIRECT')) {
          throw err
        }
        setError(err?.message ?? 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }

        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono  { font-family: 'Space Mono', monospace; }
        body { font-family: 'Inter', -apple-system, sans-serif; }

        .ledger-card { background: var(--card); border: 1.5px solid var(--line-md); border-radius: 6px; }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 4px;
          background: var(--marigold);
          color: var(--teal-dark); font-size: 14px; font-weight: 700;
          text-decoration: none; border: 1.5px solid var(--ink);
          box-shadow: 3px 3px 0 var(--ink);
          transition: all 0.15s ease; cursor: pointer;
        }
        .btn-primary:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--ink); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: 3px 3px 0 var(--ink); }

        .text-link { font-size: 13px; font-weight: 600; color: var(--ink-3); text-decoration: none;
          border-bottom: 1.5px solid var(--line-md); padding-bottom: 1px; background: none; cursor: pointer; }
        .text-link:hover { color: var(--teal-dark); border-color: var(--teal); }

        .field-input {
          width: 100%;
          background: var(--paper);
          border: 1.5px solid var(--line-md);
          border-radius: 4px;
          padding: 12px 14px;
          font-size: 14px;
          color: var(--ink);
          font-family: 'Inter', -apple-system, sans-serif;
          transition: border-color 0.15s ease;
          appearance: none;
        }
        .field-input:focus {
          outline: none;
          border-color: var(--teal);
        }
        .field-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .field-input::placeholder { color: var(--ink-4); }

        select.field-input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B655A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
          cursor: pointer;
        }

        .installment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
        .installment-option input { display: none; }
        .installment-label {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 12px 8px; border-radius: 4px; cursor: pointer;
          border: 1.5px solid var(--line-md); background: var(--paper);
          font-size: 13px; font-weight: 600; color: var(--ink-2);
          transition: all 0.15s ease; text-align: center; user-select: none;
        }
        .installment-label:hover { border-color: var(--teal); background: var(--teal-bg); }
        .installment-option input:checked + .installment-label {
          border-color: var(--teal); background: var(--teal-bg); color: var(--teal-dark);
        }

        .payout-summary {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 14px; border-radius: 4px; background: var(--teal-bg);
          border: 1.5px solid var(--teal-bdr); flex-wrap: wrap;
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)' }}
        >
          <Link
            href="/"
            className="font-display text-2xl"
            style={{ color: 'var(--ink)', fontWeight: 600 }}
          >
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 13, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium"
            style={{ color: 'var(--ink-3)' }}
          >
            ← Back to dashboard
          </Link>
        </header>

        <main className="max-w-xl mx-auto px-6 sm:px-10 py-10">
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
            New loan application
          </p>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Apply for a loan
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Fill out the details below. Your application is evaluated instantly.
          </p>

          {/* ── Financing Mode Credit Summary ── */}
          {isFinancing && (
            <div
              className="mb-6 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap"
              style={{
                background: exceedsCredit ? 'var(--magenta-bg)' : 'var(--teal-bg)',
                border: `1.5px solid ${exceedsCredit ? 'var(--magenta-bdr)' : 'var(--teal-bdr)'}`,
              }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: exceedsCredit ? 'var(--magenta)' : 'var(--teal-dark)' }}>
                  Financing: {itemName}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                  Available credit: ₱{availableCredit.toLocaleString()}
                </div>
              </div>
              {exceedsCredit && (
                <div className="text-xs font-semibold" style={{ color: 'var(--magenta)' }}>
                  This item exceeds your available credit by ₱{((principalAmount as number) - availableCredit).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* ── Standard Prefill Summary (only shown if NOT in financing mode) ── */}
          {!isFinancing && isPrefilled && (
            <div className="payout-summary mb-6" style={{ background: 'var(--marigold-bg)', border: '1.5px solid var(--marigold-bdr)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Financing: {prefillPurpose}</div>
                <div className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                  ₱{Number(prefillAmount).toLocaleString()} · {prefillTermDays} days · {prefillInstallments} installments
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ledger-card p-6 sm:p-8 flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Loan amount (₱)
              </span>
              <input
                type="number"
                name="principal_amount"
                min={1000}
                max={50000}
                step={100}
                required
                readOnly={isFinancing}
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 5000"
                className="field-input"
                style={isFinancing ? { background: 'var(--paper-2)', cursor: 'not-allowed' } : undefined}
              />
              <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                Min ₱1,000 · Max ₱50,000
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Loan term
              </span>
              <select
                name="term_days"
                required
                className="field-input"
                value={termDays}
                onChange={(e) => handleTermChange(e.target.value)}
              >
                <option value="" disabled>Select a term</option>
                {TERM_OPTIONS.map(t => (
                  <option key={t.days} value={t.days}>{t.label}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Number of installments
              </span>
              {termDays ? (
                <>
                  <div className="installment-grid">
                    {validCounts.map(n => (
                      <label key={n} className="installment-option">
                        <input
                          type="radio"
                          name="num_installments"
                          value={n}
                          checked={numInstallments === n}
                          onChange={() => setNumInstallments(n)}
                          required
                        />
                        <span className="installment-label">
                          <span className="font-display text-lg">{n}</span>
                          <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                            {n === 1 ? 'lump sum' : `every ${Math.round(Number(termDays) / n)}d`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                    Installments are spaced at least {MIN_INSTALLMENT_INTERVAL_DAYS} days apart. Paying early is always allowed.
                  </span>
                </>
              ) : (
                <div
                  className="field-input"
                  style={{ color: 'var(--ink-4)', cursor: 'not-allowed', background: 'var(--paper-2)' }}
                >
                  Select a loan term first
                </div>
              )}
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Purpose of loan
              </span>
              <select name="purpose" required className="field-input" defaultValue={prefillPurpose ?? ''}>
                <option value="" disabled>Select a purpose</option>
                {prefillPurpose && !PURPOSE_OPTIONS.includes(prefillPurpose) && (
                  <option value={prefillPurpose}>{prefillPurpose}</option>
                )}
                {PURPOSE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>

            {/* ── Shipping Address (shown only in financing mode) ── */}
            {isFinancing && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  Shipping address
                </span>
                <input
                  type="text"
                  name="shipping_address_line"
                  required
                  placeholder="House/unit no., street"
                  defaultValue={savedAddress.addressLine ?? ''}
                  className="field-input"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="shipping_barangay"
                    required
                    placeholder="Barangay"
                    defaultValue={savedAddress.barangay ?? ''}
                    className="field-input"
                  />
                  <input
                    type="text"
                    name="shipping_city"
                    required
                    placeholder="City/Municipality"
                    defaultValue={savedAddress.city ?? ''}
                    className="field-input"
                  />
                  <input
                    type="text"
                    name="shipping_province"
                    required
                    placeholder="Province"
                    defaultValue={savedAddress.province ?? ''}
                    className="field-input"
                  />
                  <input
                    type="text"
                    name="shipping_postal_code"
                    required
                    placeholder="Postal code"
                    defaultValue={savedAddress.postalCode ?? ''}
                    className="field-input"
                  />
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                  Pre-filled from your profile. Edit if shipping somewhere else.
                </span>
              </div>
            )}

            {/* ── Disbursement / payout destination (hidden in financing mode) ── */}
            {isFinancing ? (
              <>
                <input type="hidden" name="financing_type" value="item" />
                {itemName && <input type="hidden" name="item_name" value={itemName} />}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  Send my loan to
                </span>

                {!useCustomPayout && hasSavedPayout && (
                  <>
                    <div className="payout-summary">
                      <div>
                        <div className="text-sm" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>
                          {payoutLabel(savedPayout.method)} · {savedPayout.accountName}
                        </div>
                        <div className="font-mono text-xs" style={{ color: 'var(--teal)' }}>
                          {savedPayout.accountNumber}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setUseCustomPayout(true)}
                      >
                        Use a different account
                      </button>
                    </div>
                    <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                      From your profile's payout details.
                    </span>
                  </>
                )}

                {useCustomPayout && (
                  <div className="flex flex-col gap-3">
                    {hasSavedPayout && (
                      <button
                        type="button"
                        className="text-link self-start"
                        onClick={() => setUseCustomPayout(false)}
                      >
                        ← Use my saved account instead
                      </button>
                    )}

                    <input type="hidden" name="use_custom_payout" value="1" />

                    <select name="payout_method" required className="field-input" defaultValue={savedPayout.method ?? ''}>
                      <option value="" disabled>Select a payout method</option>
                      {PAYOUT_METHOD_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      name="payout_account_name"
                      required
                      placeholder="Account name"
                      defaultValue={savedPayout.accountName ?? ''}
                      className="field-input"
                    />

                    <input
                      type="text"
                      name="payout_account_number"
                      required
                      placeholder="Account / mobile number"
                      defaultValue={savedPayout.accountNumber ?? ''}
                      className="field-input"
                    />

                    {!hasSavedPayout && (
                      <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                        No saved payout details on your profile yet — this will be used for this loan only.
                        You can save it to your profile afterwards.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              className="flex flex-col gap-3 p-4 rounded-lg"
              style={{ background: 'var(--paper-2)', border: '1.5px solid var(--line-md)' }}
            >
              <div className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                <strong style={{ color: 'var(--ink)' }}>Terms &amp; Conditions.</strong> By
                submitting this application, you certify that all information provided —
                including your identity, income, address, and payout/shipping details —
                is true and accurate. Submitting false, misleading, or fraudulent
                information, or using another person's identity or account to obtain a
                loan, constitutes loan fraud and may expose you to civil liability and
                criminal prosecution under applicable Philippine laws, including but not
                limited to the Revised Penal Code provisions on estafa (swindling), the
                Access Devices Regulation Act (RA 8484), the Cybercrime Prevention Act
                (RA 10175), and the Financing Company Act / Lending Company Regulation
                Act, as applicable. Lendit Be reserves the right to report suspected
                fraud to the National Bureau of Investigation (NBI), the Philippine
                National Police (PNP), the Securities and Exchange Commission (SEC), and
                other relevant authorities, and to pursue collection and legal remedies
                for any resulting losses.
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreed_to_terms"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ marginTop: 3, cursor: 'pointer' }}
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                  I have read and agree to the Terms &amp; Conditions above, and I
                  understand that fraudulent applications are subject to criminal and
                  civil liability.
                </span>
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm px-4 py-3"
                style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', borderRadius: 4, color: 'var(--magenta)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || exceedsCredit || !agreedToTerms}
              className="btn-primary w-full"
            >
              {exceedsCredit
                ? 'Exceeds available credit'
                : !agreedToTerms
                ? 'Please accept the Terms & Conditions'
                : isPending
                ? 'Submitting…'
                : 'Submit application'}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--ink-4)' }}>
              By submitting, you confirm the information provided is accurate.
              Approval and pricing are determined automatically based on your
              profile and repayment history.
            </p>
          </form>
        </main>
      </div>
    </>
  )
}