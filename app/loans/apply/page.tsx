// app/loans/apply/page.tsx
'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { submitLoanApplication } from './actions'

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

export default function LoanApplyPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
        .field-input::placeholder { color: var(--ink-4); }

        select.field-input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B655A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
          cursor: pointer;
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
                placeholder="e.g. 5000"
                className="field-input"
              />
              <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>
                Min ₱1,000 · Max ₱50,000
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Loan term
              </span>
              <select name="term_days" required className="field-input" defaultValue="">
                <option value="" disabled>Select a term</option>
                {TERM_OPTIONS.map(t => (
                  <option key={t.days} value={t.days}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Purpose of loan
              </span>
              <select name="purpose" required className="field-input" defaultValue="">
                <option value="" disabled>Select a purpose</option>
                {PURPOSE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>

            {error && (
              <div
                role="alert"
                className="text-sm px-4 py-3"
                style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', borderRadius: 4, color: 'var(--magenta)' }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? 'Submitting…' : 'Submit application'}
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