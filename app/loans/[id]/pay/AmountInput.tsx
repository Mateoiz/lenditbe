'use client'

import { useState } from 'react'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AmountInput({
  installmentDue,
  outstanding,
}: {
  installmentDue: number
  outstanding: number
}) {
  const [value, setValue] = useState(installmentDue.toFixed(2))

  return (
    <div>
      <label className="field-label">Payment amount</label>
      <div className="amount-input-wrap">
        <span className="amount-prefix">₱</span>
        <input
          type="number"
          name="amount"
          className="amount-input"
          placeholder="0.00"
          min="0.01"
          max={outstanding}
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          type="button"
          className="quick-fill-btn"
          style={{ color: 'var(--blue-mid)', borderColor: 'var(--blue-bdr)', background: 'var(--blue-bg)' }}
          onClick={() => setValue(installmentDue.toFixed(2))}
        >
          Pay installment ({peso(installmentDue)})
        </button>
        <button
          type="button"
          className="quick-fill-btn"
          style={{ color: 'var(--green)', borderColor: 'var(--green-bdr)', background: 'var(--green-bg)' }}
          onClick={() => setValue(outstanding.toFixed(2))}
        >
          Pay in full ({peso(outstanding)})
        </button>
      </div>
    </div>
  )
}