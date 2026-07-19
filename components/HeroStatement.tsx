'use client'

import { useEffect, useState } from 'react'

const ROWS = [
  { label: 'Loan disbursed', amount: 25000, delay: 0 },
  { label: 'Installment #1', amount: 8766, delay: 220 },
  { label: 'Installment #2', amount: 8766, delay: 440 },
  { label: 'Installment #3', amount: 8767, delay: 660 },
]

function useCountUp(target: number, start: boolean, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])
  return value
}

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH')}`
}

export default function HeroStatement() {
  const [mounted, setMounted] = useState(false)
  const [rowsIn, setRowsIn] = useState(0)
  const [stampIn, setStampIn] = useState(false)
  const total = useCountUp(51299, mounted, 1100)

  useEffect(() => {
    setMounted(true)
    const timers = ROWS.map((_, i) =>
      setTimeout(() => setRowsIn((n) => Math.max(n, i + 1)), 500 + i * 260)
    )
    const stampTimer = setTimeout(() => setStampIn(true), 500 + ROWS.length * 260 + 300)
    return () => { timers.forEach(clearTimeout); clearTimeout(stampTimer) }
  }, [])

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--line-md)',
        borderRadius: 8,
        boxShadow: '10px 14px 0 rgba(20,17,15,0.06), 0 2px 8px rgba(20,17,15,0.05)',
        width: '100%',
        maxWidth: 380,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 14,
          backgroundImage: 'radial-gradient(circle, var(--paper) 3.5px, transparent 4px)',
          backgroundSize: '18px 14px',
          backgroundPosition: '9px center',
          borderBottom: '1.5px dashed var(--line-md)',
        }}
      />

      <div style={{ padding: '20px 22px 24px' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
            Statement of account
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--ink-4)' }}>#0148</span>
        </div>

        <div className="mb-5">
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
            Total repayable
          </div>
          <div className="font-display" style={{ fontSize: 34, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
            {peso(total)}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed var(--line)' }}>
          {ROWS.map((row, i) => {
            const visible = rowsIn > i
            return (
              <RowLine key={row.label} row={row} visible={visible} />
            )
          })}
        </div>

        <div
          className="flex items-center justify-between mt-5 pt-4"
          style={{ borderTop: '1.5px solid var(--ink)' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
            3 of 3 paid
          </span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '4px 10px', borderRadius: 3,
              border: '2px solid var(--teal)', color: 'var(--teal-dark)',
              transform: stampIn ? 'rotate(-4deg) scale(1)' : 'rotate(-4deg) scale(0)',
              opacity: stampIn ? 1 : 0,
              transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
              mixBlendMode: 'multiply',
            }}
          >
            Settled
          </span>
        </div>
      </div>
    </div>
  )
}

function RowLine({ row, visible }: { row: { label: string; amount: number }; visible: boolean }) {
  const val = useCountUp(row.amount, visible, 500)
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{
        borderBottom: '1px dashed var(--line)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{row.label}</span>
      <span className="font-mono text-sm" style={{ color: 'var(--ink)' }}>{peso(val)}</span>
    </div>
  )
}