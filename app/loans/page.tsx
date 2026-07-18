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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        :root {
          --bg:        #F4F6FB;
          --bg-2:      #EAEEF6;
          --bg-card:   #FFFFFF;

          --ink:       #0F172A;
          --ink-2:     #334155;
          --ink-3:     #64748B;
          --ink-4:     #94A3B8;

          --blue:      #4F46E5;
          --blue-mid:  #6366F1;
          --blue-bg:   #EEF2FF;
          --blue-bdr:  #C7D2FE;

          --line:      rgba(15, 23, 42, 0.06);
          --line-md:   rgba(15, 23, 42, 0.12);

          --amber:     #D97706;
          --amber-bg:  #FFFBEB;
          --amber-bdr: #FDE68A;

          --green:     #059669;
          --green-bg:  #ECFDF5;
          --green-bdr: #6EE7B7;

          --red:       #E11D48;
          --red-bg:    #FFF1F2;
          --red-bdr:   #FECDD3;
        }

        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }
        body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }

        .card {
          background: var(--bg-card);
          border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 10px -3px rgba(15, 23, 42, 0.02);
        }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 12px;
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          color: #fff; font-size: 14px; font-weight: 600;
          text-decoration: none;
          border: none;
          box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 6px 20px 0 rgba(99, 102, 241, 0.55);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 22px; border-radius: 12px;
          background: var(--bg-card);
          color: var(--ink-2); font-size: 14px; font-weight: 600;
          text-decoration: none;
          border: 1px solid var(--line-md);
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.02);
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: var(--bg-2);
          color: var(--ink);
          border-color: var(--ink-3);
        }

        .field-input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--line-md);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: var(--ink);
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          appearance: none;
        }
        .field-input:focus {
          outline: none;
          border-color: var(--blue-mid);
          box-shadow: 0 0 0 3px var(--blue-bg);
        }
        .field-input::placeholder { color: var(--ink-4); }

        select.field-input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
          cursor: pointer;
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <Link
            href="/"
            className="font-serif text-xl"
            style={{ color: 'var(--ink)' }}
          >
            Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
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
          <h1 className="font-serif text-3xl mb-2" style={{ color: 'var(--ink)' }}>
            Apply for a loan
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Fill out the details below. Your application is evaluated instantly.
          </p>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 flex flex-col gap-6">
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
                className="text-sm px-4 py-3 rounded-lg"
                style={{ background: 'var(--red-bg)', border: '1px solid var(--red-bdr)', color: 'var(--red)' }}
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