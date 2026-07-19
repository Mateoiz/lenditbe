'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const BANKS = [
  'BDO', 'BPI', 'Metrobank', 'Landbank', 'UnionBank', 'Security Bank', 'RCBC', 'PNB', 'Chinabank', 'EastWest Bank',
]

const PICKUP_LOCATIONS = [
  'Cebuana Lhuillier — Nearest branch',
  'M Lhuillier — Nearest branch',
  'Palawan Express — Nearest branch',
]

type ChannelValue = 'gcash' | 'maya' | 'bank_transfer' | '7eleven' | 'cash_pickup'

const CHANNELS: { value: ChannelValue; label: string; color: string; sub: string }[] = [
  { value: 'gcash',         label: 'GCash',         color: '#0072CE', sub: 'Mobile wallet' },
  { value: 'maya',          label: 'Maya',          color: '#00C16E', sub: 'Mobile wallet' },
  { value: 'bank_transfer', label: 'Bank Transfer', color: '#0B5D52', sub: 'Any local bank' },
  { value: '7eleven',       label: '7-Eleven',      color: '#E4022A', sub: 'CLIQQ kiosk' },
  { value: 'cash_pickup',   label: 'Cash Pickup',   color: '#B87814', sub: 'Over-the-counter' },
]

function ChannelIcon({ channel, size = 22 }: { channel: ChannelValue; size?: number }) {
  const meta = CHANNELS.find(c => c.value === channel)!
  const initials: Record<ChannelValue, string> = {
    gcash: 'G', maya: 'M', bank_transfer: '', '7eleven': '7', cash_pickup: '₱',
  }
  if (channel === 'bank_transfer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 10L12 4L21 10" stroke={meta.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10V19M9.5 10V19M14.5 10V19M19 10V19" stroke={meta.color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M3 19H21" stroke={meta.color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: meta.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.55, fontFamily: 'Space Mono, monospace',
      flexShrink: 0,
    }}>
      {initials[channel]}
    </div>
  )
}

// ── Smooth height-animated fold wrapper ──
function Fold({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(open ? 'auto' : 0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      const target = el.scrollHeight
      setHeight(target)
      const t = setTimeout(() => setHeight('auto'), 220)
      return () => clearTimeout(t)
    } else {
      setHeight(el.scrollHeight)
      requestAnimationFrame(() => setHeight(0))
    }
  }, [open])

  return (
    <div
      style={{
        height: height === 'auto' ? 'auto' : height,
        overflow: 'hidden',
        transition: 'height 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  )
}

type Stage = 'form' | 'confirm' | 'loading' | 'success'

export interface PaymentReceipt {
  success?: boolean
  reference?: string
  amount?: number
}

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
  payAction: (formData: FormData) => Promise<PaymentReceipt | void>
}) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('form')
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(installmentDue.toFixed(2))
  const [channel, setChannel] = useState<ChannelValue>('gcash')
  const [mobileNumber, setMobileNumber] = useState('')
  const [bankName, setBankName] = useState(BANKS[0])
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0])
  const [receiptRef, setReceiptRef] = useState('')
  const [paidAt, setPaidAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [touched, setTouched] = useState(false)

  const maxAmount = Math.max(outstanding, installmentDue)
  const numericAmount = Number(amount) || 0
  const amountError =
    numericAmount <= 0 ? 'Enter an amount greater than ₱0' :
    numericAmount > maxAmount ? `Amount can't exceed ${peso(maxAmount)}` :
    null

  const channelDetailError =
    (channel === 'gcash' || channel === 'maya') && mobileNumber.replace(/\D/g, '').length !== 11
      ? 'Enter a valid 11-digit mobile number' :
    channel === 'bank_transfer' && bankAccountNumber.trim().length < 6
      ? 'Enter a valid account number' :
    null

  function handleReviewStep(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (amountError || channelDetailError) return
    setError(null)
    setStage('confirm')
  }

  function handleConfirmPayment() {
    setStage('loading')
    const ref = `MOCK-${Date.now().toString(36).toUpperCase()}`
    setReceiptRef(ref)

    const formData = new FormData()
    formData.set('amount', amount)
    formData.set('channel', channel)
    if (channel === 'gcash' || channel === 'maya') formData.set('mobile_number', mobileNumber)
    if (channel === 'bank_transfer') {
      formData.set('bank_name', bankName)
      formData.set('bank_account_number', bankAccountNumber)
    }
    if (channel === 'cash_pickup') formData.set('pickup_location', pickupLocation)

    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1400))
        const receipt = await payAction(formData)
        if (receipt?.reference) setReceiptRef(receipt.reference)
        if (receipt?.amount != null) setAmount(String(receipt.amount))
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

  function copyReference() {
    navigator.clipboard.writeText(receiptRef).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const channelMeta = CHANNELS.find((c) => c.value === channel)!

  // ── LOADING ──
  if (stage === 'loading') {
    return (
      <div className="ledger-card p-10 flex flex-col items-center text-center" style={{ gap: 16 }}>
        <div className="pay-spinner" style={{ borderTopColor: channelMeta.color }} />
        <p className="font-semibold" style={{ color: 'var(--ink)' }}>Processing your payment…</p>
        <p className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
          Confirming {peso(Number(amount))} via {channelMeta.label}
        </p>
        <style>{`
          .pay-spinner { width: 48px; height: 48px; border-radius: 50%; border: 4px solid var(--teal-bg); animation: pay-spin 0.8s linear infinite; }
          @keyframes pay-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  // ── CONFIRM / REVIEW ──
  if (stage === 'confirm') {
    return (
      <div className="ledger-card overflow-hidden confirm-in">
        <div className="punch-line" />
        <div className="p-8 flex flex-col items-center text-center" style={{ gap: 4 }}>
          <div className="channel-avatar" style={{ background: `${channelMeta.color}18`, border: `1.5px solid ${channelMeta.color}55` }}>
            <ChannelIcon channel={channel} size={32} />
          </div>

          <p className="font-mono text-xs mt-4 uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>You're about to pay</p>
          <p className="font-display text-4xl mt-1 mb-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>{peso(numericAmount)}</p>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
            via <strong style={{ color: channelMeta.color }}>{channelMeta.label}</strong>
          </p>

          <div className="w-full" style={{ borderTop: '1.5px dashed var(--line-md)', paddingTop: 4 }}>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Installment</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>#{installmentNumber}</span>
            </div>
            {(channel === 'gcash' || channel === 'maya') && (
              <div className="summary-row">
                <span style={{ color: 'var(--ink-3)' }}>Mobile number</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>{mobileNumber}</span>
              </div>
            )}
            {channel === 'bank_transfer' && (
              <>
                <div className="summary-row">
                  <span style={{ color: 'var(--ink-3)' }}>Bank</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>{bankName}</span>
                </div>
                <div className="summary-row">
                  <span style={{ color: 'var(--ink-3)' }}>Account number</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>{bankAccountNumber}</span>
                </div>
              </>
            )}
            {channel === 'cash_pickup' && (
              <div className="summary-row">
                <span style={{ color: 'var(--ink-3)' }}>Pickup location</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--ink)', textAlign: 'right', maxWidth: 200 }}>{pickupLocation}</span>
              </div>
            )}
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Remaining after this payment</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>{peso(Math.max(0, outstanding - numericAmount))}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-6">
            <button type="button" className="btn-ghost-flex" onClick={() => setStage('form')}>← Back</button>
            <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={handleConfirmPayment}>Confirm & pay</button>
          </div>
        </div>

        <style>{`
          .channel-avatar { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .confirm-in { animation: receipt-fade 0.25s ease-out both; }
          @keyframes receipt-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .btn-ghost-flex {
            flex: 1; display: flex; align-items: center; justify-content: center;
            padding: 12px 16px; border-radius: 4px; font-size: 14px; font-weight: 700;
            color: var(--ink-2); background: var(--card); border: 1.5px solid var(--line-md);
            cursor: pointer; transition: all 0.15s ease;
          }
          .btn-ghost-flex:hover { border-color: var(--teal); color: var(--teal-dark); background: var(--teal-bg); }
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
              <path className="check-path" d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-display text-2xl mt-4" style={{ color: 'var(--ink)', fontWeight: 500 }}>Payment received</p>
          <p className="font-display text-4xl mt-1 mb-1" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>{peso(Number(amount))}</p>
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--ink-4)' }}>
            {paidAt?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="w-full" style={{ borderTop: '1.5px dashed var(--line-md)', paddingTop: 4 }}>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Payment method</span>
              <span className="font-mono font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                <ChannelIcon channel={channel} size={16} /> {channelMeta.label}
              </span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Installment</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>#{installmentNumber}</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Reference no.</span>
              <button type="button" onClick={copyReference} className="font-mono"
                style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Copy reference number">
                {receiptRef}
                <span style={{ fontSize: 11, color: copied ? 'var(--teal-dark)' : 'var(--ink-4)' }}>{copied ? '✓ Copied' : '⧉'}</span>
              </button>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Status</span>
              <span className="stamp" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>Paid</span>
            </div>
          </div>
          <button className="btn-primary mt-6" style={{ textDecoration: 'none' }}
            onClick={() => { router.refresh(); router.push(`/loans/${loanId}`) }}>
            Done
          </button>
        </div>

        <style>{`
          .check-circle { width: 60px; height: 60px; border-radius: 50%; background: var(--teal); display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--ink); animation: check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          @keyframes check-pop { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .check-path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: check-draw 0.35s 0.25s ease-out forwards; }
          @keyframes check-draw { to { stroke-dashoffset: 0; } }
          .receipt-in { animation: receipt-fade 0.3s ease-out both; }
          @keyframes receipt-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    )
  }

  // ── FORM ──
  return (
    <form onSubmit={handleReviewStep} className="ledger-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* STEP 1 — Amount */}
      <div className="form-step">
        <div className="step-header">
          <span className="step-number">1</span>
          <span className="step-title">Payment amount</span>
        </div>
        <div className="amount-input-wrap">
          <span className="amount-prefix">₱</span>
          <input
            type="number"
            className="amount-input"
            placeholder="0.00"
            min="0.01"
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        {touched && amountError && <p className="text-xs mt-2" style={{ color: 'var(--magenta)' }}>{amountError}</p>}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button type="button" className="quick-fill-btn"
            style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal-bdr)', background: 'var(--teal-bg)' }}
            onClick={() => setAmount(installmentDue.toFixed(2))}>
            Pay installment ({peso(installmentDue)})
          </button>
          <button type="button" className="quick-fill-btn"
            style={{ color: 'var(--marigold-dark)', borderColor: 'var(--marigold-bdr)', background: 'var(--marigold-bg)' }}
            onClick={() => setAmount(outstanding.toFixed(2))}>
            Pay in full ({peso(outstanding)})
          </button>
        </div>
      </div>

      <div className="step-divider" />

      {/* STEP 2 — Channel */}
      <div className="form-step">
        <div className="step-header">
          <span className="step-number">2</span>
          <span className="step-title">Payment method</span>
        </div>
        <div className="channel-grid">
          {CHANNELS.map((ch) => (
            <label key={ch.value} className="channel-option">
              <input type="radio" name="channel" value={ch.value} checked={channel === ch.value} onChange={() => setChannel(ch.value)} />
              <span className="channel-label" style={channel === ch.value ? { borderColor: ch.color, background: `${ch.color}14` } : undefined}>
                <ChannelIcon channel={ch.value} />
                <span className="channel-label-text">
                  <span className="channel-label-name" style={channel === ch.value ? { color: ch.color } : undefined}>{ch.label}</span>
                  <span className="channel-label-sub">{ch.sub}</span>
                </span>
              </span>
            </label>
          ))}
        </div>

        {/* Folding channel-specific detail panel */}
        <Fold open={true} key={channel}>
          <div className="channel-detail-panel" style={{ borderColor: `${channelMeta.color}40` }}>
            {(channel === 'gcash' || channel === 'maya') && (
              <div>
                <label className="detail-label">{channelMeta.label} mobile number</label>
                <input
                  type="tel"
                  className="field-input"
                  placeholder="09XX XXX XXXX"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={13}
                />
                <p className="detail-hint">Must match the number registered to your {channelMeta.label} account.</p>
                {touched && channelDetailError && <p className="text-xs mt-1" style={{ color: 'var(--magenta)' }}>{channelDetailError}</p>}
              </div>
            )}

            {channel === 'bank_transfer' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="detail-label">Bank</label>
                  <select className="field-input" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="detail-label">Account number (source)</label>
                  <input type="text" className="field-input" placeholder="e.g. 0012 3456 789"
                    value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                  {touched && channelDetailError && <p className="text-xs mt-1" style={{ color: 'var(--magenta)' }}>{channelDetailError}</p>}
                </div>
                <div className="bank-slip">
                  <div className="bank-slip-row"><span>Transfer to</span><span className="font-mono font-semibold">Lendit Be — 0019 8877 2233</span></div>
                  <div className="bank-slip-row"><span>Reference to include</span><span className="font-mono font-semibold">LOAN-{loanId.slice(0, 8).toUpperCase()}</span></div>
                </div>
              </div>
            )}

            {channel === '7eleven' && (
              <div className="info-box">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Pay at any 7-Eleven CLIQQ kiosk</p>
                <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
                  A barcode and reference number will be generated after you confirm. Show it at the counter within 24 hours.
                </p>
              </div>
            )}

            {channel === 'cash_pickup' && (
              <div>
                <label className="detail-label">Pickup location</label>
                <select className="field-input" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}>
                  {PICKUP_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <p className="detail-hint">Bring a valid ID and this reference number to any branch.</p>
              </div>
            )}
          </div>
        </Fold>
      </div>

      {error && (
        <div role="alert" className="text-sm px-4 py-3 mt-4"
          style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div className="mt-6">
        <button type="submit" className="btn-primary" disabled={isPending}>
          Review payment →
        </button>
        <p className="font-mono text-xs text-center mt-3" style={{ color: 'var(--ink-4)' }}>
          You'll confirm the details before it's charged.
        </p>
      </div>

<style>{`
  .form-step { padding: 4px 0; }
  .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .step-number {
    width: 22px; height: 22px; border-radius: 50%; background: var(--teal-dark); color: #fff;
    font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .step-title { font-size: 13px; font-weight: 700; letter-spacing: 0.03em; color: var(--ink); }
  .step-divider { height: 1px; background: var(--line); margin: 20px 0; }

  .channel-label { align-items: flex-start !important; text-align: left !important; padding: 12px 10px !important; }
  .channel-label-text { display: flex; flex-direction: column; gap: 1px; margin-top: 2px; }
  .channel-label-name { font-size: 13px; font-weight: 700; }
  .channel-label-sub { font-size: 10px; font-weight: 500; color: var(--ink-4); font-family: 'Space Mono', monospace; }

  .channel-detail-panel {
    margin-top: 14px; padding: 16px; border-radius: 6px;
    background: var(--paper-2); border: 1.5px solid;
  }
  .detail-label {
    display: block; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-4); margin-bottom: 8px;
  }
  .detail-hint { font-size: 11px; font-family: 'Space Mono', monospace; color: var(--ink-4); margin-top: 8px; }

  .bank-slip {
    background: var(--card); border: 1px dashed var(--line-md); border-radius: 4px;
    padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
  }
  .bank-slip-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--ink-3); }
  .info-box { background: var(--teal-bg); border: 1px solid var(--teal-bdr); border-radius: 4px; padding: 12px 14px; }

  /* ── FIX: field-input was referenced but never defined in this component ── */
  .field-input {
    width: 100%;
    background: var(--card);
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
    </form>
  )
}