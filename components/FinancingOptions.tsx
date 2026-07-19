// components/FinancingOptions.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getValidInstallmentCounts } from '@/lib/installments'

const TERM_OPTIONS = [15, 30, 45, 60]

// Rough estimate only — real rate comes from underwriting at submit time.
// This just gives the user a ballpark so they can pick a plan.
const ESTIMATE_INTEREST_RATE = 6.0
const ESTIMATE_SERVICE_FEE_RATE = 4.0
const PROCESSING_FEE = 150

function estimateMonthly(principal: number, termDays: number, numInstallments: number) {
  const interest = principal * (ESTIMATE_INTEREST_RATE / 100) * (termDays / 365)
  const serviceFee = principal * (ESTIMATE_SERVICE_FEE_RATE / 100)
  const totalRepayable = principal + interest + serviceFee + PROCESSING_FEE
  return Math.ceil(totalRepayable / numInstallments)
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,17,15,0.4)' }}
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-md p-6 rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg" style={{ color: 'var(--ink)' }}>Choose a plan</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full text-sm"
            style={{ color: 'var(--ink-3)', background: 'var(--paper-2)' }}
          >
            ✕
          </button>
        </div>

        {/* ── Product summary ── */}
        <div
          className="flex items-center gap-4 mb-6 p-3 rounded-xl"
          style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
        >
          {imageSrc && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--line-md)' }}>
              <Image src={imageSrc} alt={purpose} fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{purpose}</div>
            <div className="font-display text-lg" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
              ₱{price.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {TERM_OPTIONS.map((termDays) => {
            const counts = getValidInstallmentCounts(termDays)
            const bestCount = counts[counts.length - 1] // most installments = lowest monthly
            const monthly = estimateMonthly(price, termDays, bestCount)

            return (
              <Link
                key={termDays}
                href={`/loans/apply?amount=${price}&purpose=${encodeURIComponent(purpose)}&term_days=${termDays}&num_installments=${bestCount}&financing=1&item=${encodeURIComponent(purpose)}`}
                className="flex items-center justify-between p-4 rounded-lg transition-all"
                style={{ border: '1.5px solid var(--line-md)', textDecoration: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--teal)'
                  e.currentTarget.style.background = 'var(--teal-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line-md)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{termDays}-day term</div>
                  <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{bestCount} installments</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-base" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
                    ~₱{monthly.toLocaleString()}
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--ink-4)' }}>/mo</div>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-xs font-mono mt-4 text-center" style={{ color: 'var(--ink-4)' }}>
          Estimated only — your actual rate depends on your credit assessment.
        </p>
      </div>
    </div>
  )
}