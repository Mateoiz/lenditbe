// app/loans/[id]/pay/page.tsx
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { submitPayment } from './actions'
import PaymentFlow from './PaymentFlow'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CHANNELS = [
  { value: 'gcash',         label: 'GCash',        icon: '💙' },
  { value: 'maya',          label: 'Maya',          icon: '💚' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: '7eleven',       label: '7-Eleven',      icon: '🏪' },
  { value: 'cash_pickup',   label: 'Cash Pickup',   icon: '💵' },
]

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loan } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .eq('borrower_id', user.id)
    .maybeSingle()

  if (!loan) notFound()
  if (!['active', 'disbursed', 'approved', 'overdue'].includes(loan.status)) {
    redirect(`/loans/${id}`)
  }

  // Next unpaid installment (oldest first)
  const { data: nextInstallment } = await supabase
    .from('loan_installments')
    .select('*')
    .eq('loan_id', id)
    .in('status', ['upcoming', 'due', 'overdue'])
    .order('installment_number', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Outstanding balance
  const { data: priorPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('loan_id', id)

  const totalPaid   = (priorPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = Math.max(0, Number(loan.total_repayable) - totalPaid)

  if (!nextInstallment) {
    // No unpaid installments — shouldn't be payable, redirect back
    redirect(`/loans/${id}`)
  }

  if (outstanding <= 0) {
    // Data mismatch guard: loan shows no outstanding balance but an
    // installment is still marked unpaid. Don't let a broken UI state
    // through — send back to loan details instead of crashing the form.
    redirect(`/loans/${id}`)
  }

  // Bind both loanId and installmentId into the action
  const payAction = submitPayment.bind(null, id, nextInstallment.id)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        :root {
          --bg: #F4F6FB; --bg-2: #EAEEF6; --bg-card: #FFFFFF;
          --ink: #0F172A; --ink-2: #334155; --ink-3: #64748B; --ink-4: #94A3B8;
          --blue: #4F46E5; --blue-mid: #6366F1; --blue-bg: #EEF2FF; --blue-bdr: #C7D2FE;
          --line: rgba(15,23,42,0.06); --line-md: rgba(15,23,42,0.12);
          --amber: #D97706; --amber-bg: #FFFBEB; --amber-bdr: #FDE68A;
          --green: #059669; --green-bg: #ECFDF5; --green-bdr: #6EE7B7;
          --red: #E11D48; --red-bg: #FFF1F2; --red-bdr: #FECDD3;
        }
        body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }

        .card {
          background: var(--bg-card); border: 1px solid var(--line); border-radius: 20px;
          box-shadow: 0 10px 30px -5px rgba(15,23,42,0.04), 0 4px 10px -3px rgba(15,23,42,0.02);
        }

        .amount-input-wrap { position: relative; }
        .amount-prefix {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          font-family: 'DM Serif Display', Georgia, serif; font-size: 24px;
          color: var(--ink-3); pointer-events: none;
        }
        .amount-input {
          width: 100%; padding: 18px 16px 18px 38px;
          font-family: 'DM Serif Display', Georgia, serif; font-size: 28px;
          color: var(--ink); background: var(--bg);
          border: 2px solid var(--line-md); border-radius: 14px;
          outline: none; transition: border-color 0.15s ease;
          -moz-appearance: textfield;
        }
        .amount-input::-webkit-inner-spin-button,
        .amount-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .amount-input:focus { border-color: var(--blue-mid); background: var(--bg-card); }

        .channel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .channel-option input { display: none; }
        .channel-label {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 14px 10px; border-radius: 14px; cursor: pointer;
          border: 2px solid var(--line-md); background: var(--bg-card);
          font-size: 13px; font-weight: 600; color: var(--ink-2);
          transition: all 0.15s ease; text-align: center; user-select: none;
        }
        .channel-label:hover { border-color: var(--blue-bdr); background: var(--blue-bg); }
        .channel-option input:checked + .channel-label {
          border-color: var(--blue-mid); background: var(--blue-bg); color: var(--blue-mid);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .channel-icon { font-size: 22px; }

        .ref-input {
          width: 100%; padding: 13px 16px;
          font-family: 'JetBrains Mono', monospace; font-size: 14px;
          color: var(--ink); background: var(--bg);
          border: 2px solid var(--line-md); border-radius: 12px;
          outline: none; transition: border-color 0.15s ease;
        }
        .ref-input:focus { border-color: var(--blue-mid); background: var(--bg-card); }
        .ref-input::placeholder { color: var(--ink-4); }

        .submit-btn {
          width: 100%; padding: 16px; border-radius: 14px;
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 4px 14px 0 rgba(99,102,241,0.4);
          transition: all 0.2s ease; letter-spacing: 0.01em;
        }
        .submit-btn:hover {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          transform: translateY(-1px); box-shadow: 0 6px 20px 0 rgba(99,102,241,0.55);
        }
        .submit-btn:active { transform: translateY(0); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 12px;
          color: var(--ink-2); font-size: 13px; font-weight: 600;
          text-decoration: none; border: 1px solid var(--line-md);
          background: var(--bg-card); transition: all 0.15s ease;
        }
        .btn-ghost:hover { background: var(--bg-2); border-color: var(--ink-3); }

        .quick-fill-btn {
          font-size: 12px; font-family: 'JetBrains Mono', monospace;
          padding: 6px 12px; border-radius: 8px; border: 1px solid; cursor: pointer;
          background: transparent; transition: opacity 0.15s ease;
        }
        .quick-fill-btn:hover { opacity: 0.75; }

        .summary-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 14px;
        }
        .summary-row:last-child { border-bottom: none; }

        .field-label {
          display: block; font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
          margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;
        }

        .installment-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px; font-size: 12px;
          font-family: 'JetBrains Mono', monospace; font-weight: 500;
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-card)' }}
        >
          <Link href="/dashboard" className="font-serif text-xl"
            style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
            Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
          </Link>
          <Link href={`/loans/${id}`} className="btn-ghost">← Loan details</Link>
        </header>

        <main className="max-w-lg mx-auto px-6 py-10">
          <h1 className="font-serif text-3xl mb-1"
            style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
            Make a payment
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Paying installment {nextInstallment.installment_number} of your loan.
          </p>

          {/* Loan summary */}
          <div className="card p-6 mb-6">
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Outstanding balance</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                {peso(outstanding)}
              </span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>This installment</span>
              <div className="flex items-center gap-2">
                <span
                  className="installment-badge"
                  style={{
                    background: nextInstallment.status === 'overdue' ? 'var(--red-bg)' : 'var(--blue-bg)',
                    color: nextInstallment.status === 'overdue' ? 'var(--red)' : 'var(--blue-mid)',
                    border: `1px solid ${nextInstallment.status === 'overdue' ? 'var(--red-bdr)' : 'var(--blue-bdr)'}`,
                  }}
                >
                  #{nextInstallment.installment_number} · due {formatDate(nextInstallment.due_date)}
                </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                  {peso(nextInstallment.amount_due)}
                </span>
              </div>
            </div>
            {nextInstallment.amount_paid > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--ink-3)' }}>Already paid on this</span>
                <span className="font-mono" style={{ color: 'var(--green)' }}>
                  {peso(nextInstallment.amount_paid)}
                </span>
              </div>
            )}
            <div className="summary-row">
              <span style={{ color: 'var(--ink-3)' }}>Loan principal</span>
              <span className="font-mono" style={{ color: 'var(--ink-3)' }}>
                {peso(loan.principal_amount)}
              </span>
            </div>
          </div>

          {/* Payment flow: form -> loading -> receipt */}
          <PaymentFlow
            loanId={id}
            installmentDue={Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid)}
            outstanding={outstanding}
            installmentNumber={nextInstallment.installment_number}
            payAction={payAction}
          />
        </main>
      </div>
    </>
  )
}