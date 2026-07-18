'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="submit-btn" disabled={pending}>
      {pending ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            style={{ animation: 'spin 0.7s linear infinite' }}
          >
            <circle
              cx="12" cy="12" r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="42"
              strokeDashoffset="14"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
          Processing payment…
        </span>
      ) : (
        'Confirm payment'
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </button>
  )
}