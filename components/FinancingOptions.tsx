'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { getValidInstallmentCounts } from '@/lib/installments'

const TERM_OPTIONS = [15, 30, 45, 60] as const

// NOTE: PROCESSING_FEE must stay in sync with underwriting.ts.
// If you change the fee in underwriting, update it here too.
const ESTIMATE_INTEREST_RATE  = 6.0
const ESTIMATE_SERVICE_FEE_RATE = 4.0
const PROCESSING_FEE = 150

// Monthly payment estimate — real rate comes from underwriting at submit time
function estimateMonthly(principal: number, termDays: number, numInstallments: number): number {
  const interest    = principal * (ESTIMATE_INTEREST_RATE / 100) * (termDays / 365)
  const serviceFee  = principal * (ESTIMATE_SERVICE_FEE_RATE / 100)
  const total       = principal + interest + serviceFee + PROCESSING_FEE
  return Math.ceil(total / numInstallments)
}

// QoL: total repayable estimate for each plan option
function estimateTotal(principal: number, termDays: number): number {
  const interest   = principal * (ESTIMATE_INTEREST_RATE / 100) * (termDays / 365)
  const serviceFee = principal * (ESTIMATE_SERVICE_FEE_RATE / 100)
  return Math.ceil(principal + interest + serviceFee + PROCESSING_FEE)
}

// QoL: label each tier meaningfully so users understand the trade-off
const TERM_LABELS: Record<number, { label: string; highlight?: boolean }> = {
  15: { label: 'Least interest' },
  30: { label: 'Recommended',   highlight: true },
  45: { label: 'Balanced' },
  60: { label: 'Lowest monthly' },
}

export default function FinancingOptions({
  price,
  purpose,
  imageSrc,
  onClose,
}: {
  price: number
  purpose: string
  imageSrc?: string
  onClose: () => void
}) {
  // FIX: close on Escape key press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // QoL: prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,17,15,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a financing plan"
    >
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .financing-modal {
          animation: slide-up 0.22s cubic-bezier(0.16,1,0.3,1) both;
        }
      `}</style>

      <div
        className="financing-modal card w-full sm:max-w-md p-6 rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--card)', maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-lg" style={{ color: 'var(--ink)' }}>Choose a plan</h3>
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>Estimates only · final rate set at approval</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
            style={{ color: 'var(--ink-3)', background: 'var(--paper-2)', border: '1px solid var(--line-md)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Product summary */}
        <div
          className="flex items-center gap-4 mb-6 p-3 rounded-xl"
          style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
        >
          {imageSrc && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--line-md)' }}>
              <Image src={imageSrc} alt={purpose} fill sizes="64px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{purpose}</div>
            <div className="font-display text-lg mt-0.5" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
              ₱{price.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Plan options */}
        <div className="flex flex-col gap-2.5">
          {TERM_OPTIONS.map((termDays) => {
            // FIX: guard against getValidInstallmentCounts returning an empty array.
            // This can happen if termDays < MIN_INSTALLMENT_INTERVAL_DAYS.
            const counts = getValidInstallmentCounts(termDays)
            if (counts.length === 0) return null

            const bestCount = counts[counts.length - 1]
            const monthly   = estimateMonthly(price, termDays, bestCount)
            const total     = estimateTotal(price, termDays)
            const meta      = TERM_LABELS[termDays] ?? { label: `${termDays}-day` }

            return (
              <Link
                key={termDays}
                href={`/loans/apply?amount=${price}&purpose=${encodeURIComponent(purpose)}&term_days=${termDays}&num_installments=${bestCount}&financing=1&item=${encodeURIComponent(purpose)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 8, textDecoration: 'none',
                  border: meta.highlight ? '2px solid var(--marigold)' : '1.5px solid var(--line-md)',
                  background: meta.highlight ? 'var(--marigold-bg)' : 'transparent',
                  position: 'relative', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!meta.highlight) {
                    e.currentTarget.style.borderColor = 'var(--teal)'
                    e.currentTarget.style.background  = 'var(--teal-bg)'
                  }
                }}
                onMouseLeave={e => {
                  if (!meta.highlight) {
                    e.currentTarget.style.borderColor = 'var(--line-md)'
                    e.currentTarget.style.background  = 'transparent'
                  }
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {termDays}-day term
                    </span>
                    {/* QoL: highlight recommended plan */}
                    {meta.highlight && (
                      <span
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--marigold)', color: 'var(--teal-dark)', border: '1px solid var(--marigold-dark)' }}
                      >
                        ★ {meta.label}
                      </span>
                    )}
                    {!meta.highlight && (
                      <span className="font-mono text-xs" style={{ color: 'var(--ink-4)' }}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--ink-4)' }}>
                    {bestCount} installment{bestCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="text-right">
                  {/* QoL: show monthly AND total so users see the real cost */}
                  <div className="font-display text-base" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
                    ~₱{monthly.toLocaleString()}
                    <span className="font-mono text-xs ml-1" style={{ color: 'var(--ink-4)' }}>/mo</span>
                  </div>
                  <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    Total ~₱{total.toLocaleString()}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer disclaimer */}
        <p className="text-xs font-mono mt-5 text-center leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          Amounts are estimates based on a {ESTIMATE_INTEREST_RATE}% interest rate.<br />
          Your actual terms depend on your credit assessment.
        </p>
      </div>
    </div>
  )
}