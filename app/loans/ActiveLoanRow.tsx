'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Meta {
  label: string
  bg: string
  color: string
  border: string
}

interface Loan {
  id: string
  principal_amount: number
  applied_at: string
  due_date: string | null
  status: string
}

interface Installment {
  amount_due: number
  due_date: string
}

export default function ActiveLoanRow({
  loan,
  meta,
  next,
  canPay,
}: {
  loan: Loan
  meta: Meta
  next: Installment | undefined
  canPay: boolean
}) {
  const router = useRouter()

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/loans/${loan.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/loans/${loan.id}`)
      }}
      className="loan-row"
      style={{ color: 'inherit', cursor: 'pointer' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="font-serif text-lg"
            style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}
          >
            {peso(loan.principal_amount)}
          </span>
          <span
            className="status-pill"
            style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
          >
            {meta.label}
          </span>
        </div>
        <div className="font-mono text-xs flex flex-wrap gap-3" style={{ color: 'var(--ink-3)' }}>
          <span>Applied {formatDate(loan.applied_at)}</span>
          {loan.due_date && <span>Due {formatDate(loan.due_date)}</span>}
          {next && (
            <span style={{ color: loan.status === 'overdue' ? 'var(--red)' : 'var(--ink-3)' }}>
              Next payment: {peso(next.amount_due)} on {formatDate(next.due_date)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {canPay && (
          <Link
            href={`/loans/${loan.id}/pay`}
            onClick={(e) => e.stopPropagation()}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            Pay now
          </Link>
        )}
        <svg className="chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}