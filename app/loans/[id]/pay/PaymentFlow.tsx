'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CHANNELS = [
  { value: 'gcash',         label: 'GCash',         icon: '💙' },
  { value: 'maya',          label: 'Maya',          icon: '💚' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: '7eleven',       label: '7-Eleven',      icon: '🏪' },
  { value: 'cash_pickup',   label: 'Cash Pickup',   icon: '💵' },
]

type Stage = 'form' | 'loading' | 'success'

export default function PaymentFlow({
  loanId,
  installmentDue,
  outstanding,
  installmentNumber,
  payAction,
}: {
  loanId: string
  installmentDue: number
  outstanding: number
  installmentNumber: number
  payAction: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('form')
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(installmentDue.toFixed(2))
  const [channel, setChannel] = useState('gcash')
  const [receiptRef, setReceiptRef] = useState('')
  const [paidAt, setPaidAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStage('loading')

    const ref = `MOCK-${Date.now().toString(36).toUpperCase()}`
    setReceiptRef(ref)

    const formData = new FormData()
    formData.set('amount', amount)
    formData.set('channel', channel)

    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1400))
        await payAction(formData)
        setPaidAt(new Date())
        setStage('success')
      } catch (err: any) {
        if (err?.digest?.startsWith?.('NEXT_REDIRECT')) {
          setPaidAt(new Date())
          setStage('success')
          return
        }
        setError(err?.message ?? 'Payment failed. Please try again.')
        setStage('form')
      }
    })
  }

  const channelMeta = CHANNELS.find((c) => c.value === channel)!

  // ── LOADING ──
  if (stage === 'loading') {
    return (
      <div className="ledger-card p-10 flex flex-col items-center text-center" style={{ gap: 16 }}>
        <div className="pay-spinner" />
        <p className="font-semibold" style={{ color: 'var(--ink)' }}>Processing your payment…</p>
        <p className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
          Confirming {peso(Number(amount))} via {channelMeta.label}
        </p>
        <style>{`
          .pay-spinner {
            width: 48px; height: 48px; border-radius: 50%;
            border: 4px solid var(--teal-bg);
            border-top-color: var(--teal);
            animation: pay-spin 0.8s linear infinite;
          }
          @keyframes pay-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  // ── SUCCESS / RECEIPT ──
  if (stage === 'success') {
    return (
      <div className="ledger-card overflow-hidden receipt-in">
        <div className="punch-line" />
        <div className="p-8 flex flex-col items-center text-center" style={{ gap: 4 }}>
          <div className="check-circle">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                className="check-path"
                d="M5 13l4 4L19 7"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="font-display text-2xl mt-4" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Payment received
          </p>
          <p className="font-display text-4xl mt-1 mb-1" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
            {peso(Number(amount))}
          </p>
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--ink-4)' }}>
            {paidAt?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>

          <div className="w-full" style={{ borderTop: '1.5px dashed var(--line-md)', paddingTop: 4 }}>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Payment method</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                {channelMeta.icon} {channelMeta.label}
              </span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Installment</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                #{installmentNumber}
              </span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Reference no.</span>
              <span className="font-mono" style={{ color: 'var(--ink)' }}>{receiptRef}</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Status</span>
              <span className="stamp" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                Paid
              </span>
            </div>
          </div>

          <button
            className="btn-primary mt-6"
            style={{ textDecoration: 'none' }}
            onClick={() => {
              router.refresh()
              router.push(`/loans/${loanId}`)
            }}
          >
            Done
          </button>
        </div>

        <style>{`
          .check-circle {
            width: 60px; height: 60px; border-radius: 50%;
            background: var(--teal);
            display: flex; align-items: center; justify-content: center;
            border: 1.5px solid var(--ink);
            animation: check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          @keyframes check-pop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .check-path {
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: check-draw 0.35s 0.25s ease-out forwards;
          }
          @keyframes check-draw { to { stroke-dashoffset: 0; } }
          .receipt-in { animation: receipt-fade 0.3s ease-out both; }
          @keyframes receipt-fade {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  // ── FORM ──
  return (
    <form onSubmit={handleSubmit} className="ledger-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Amount */}
      <div>
        <label className="field-label">Payment amount</label>
        <div className="amount-input-wrap">
          <span className="amount-prefix">₱</span>
          <input
            type="number"
            className="amount-input"
            placeholder="0.00"
            min="0.01"
            max={Math.max(outstanding, installmentDue)}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            type="button"
            className="quick-fill-btn"
            style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal-bdr)', background: 'var(--teal-bg)' }}
            onClick={() => setAmount(installmentDue.toFixed(2))}
          >
            Pay installment ({peso(installmentDue)})
          </button>
          <button
            type="button"
            className="quick-fill-btn"
            style={{ color: 'var(--marigold-dark)', borderColor: 'var(--marigold-bdr)', background: 'var(--marigold-bg)' }}
            onClick={() => setAmount(outstanding.toFixed(2))}
          >
            Pay in full ({peso(outstanding)})
          </button>
        </div>
      </div>

      {/* Payment channel */}
      <div>
        <label className="field-label">Payment method</label>
        <div className="channel-grid">
          {CHANNELS.map((ch) => (
            <label key={ch.value} className="channel-option">
              <input
                type="radio"
                name="channel"
                value={ch.value}
                checked={channel === ch.value}
                onChange={() => setChannel(ch.value)}
              />
              <span className="channel-label">
                <span className="channel-icon">{ch.icon}</span>
                {ch.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="text-sm px-4 py-3"
          style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)', borderRadius: 4 }}
        >
          {error}
        </div>
      )}

      <div>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Processing…' : 'Confirm payment'}
        </button>
        <p className="font-mono text-xs text-center mt-3" style={{ color: 'var(--ink-4)' }}>
          Payment is recorded instantly and applied to your schedule.
        </p>
      </div>
    </form>
  )
}