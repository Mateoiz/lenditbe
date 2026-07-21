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

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .eq('borrower_id', user.id)
    .maybeSingle()

if (loanError || !loan) notFound()

  // Reconcile late fees against actual due_date before computing what's owed
  await supabase.rpc('apply_late_fees_for_loan', { p_loan_id: id })

  // 1. FIX: Exclude 'approved' — loan must be released before accepting payments
  const canPay = ['active', 'disbursed', 'overdue'].includes(loan.status)

  const { data: installments, error: instError } = await supabase
    .from('loan_installments')
    .select('*')
    .eq('loan_id', id)
    .order('installment_number', { ascending: true })

  const { data: priorPayments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('loan_id', id)
const totalPaid = (priorPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const totalLateFees = (installments ?? []).reduce((s, i) => s + Number(i.late_fee ?? 0), 0)
  const outstanding = Math.max(0, Number(loan.total_repayable) + totalLateFees - totalPaid)

const nextInstallment = (installments ?? []).find(
    inst => Math.round((Number(inst.amount_due) - Number(inst.amount_paid)) * 100) / 100 >= 0.05
  )

  // 2. FIX: Explain dead-ends on the page, including the 'approved' pre-disbursement state
  let blocked: { title: string; body: string } | null = null

  if (loanError || instError || paymentsError) {
    blocked = {
      title: 'Something went wrong loading this loan',
      body: 'We couldn\u2019t load your payment details. Please try again in a moment.',
    }
  } else if (!canPay) {
    blocked = {
      title: 'Payments unavailable',
      body:
        loan.status === 'completed' ? 'This loan has already been paid off in full.'
        : loan.status === 'pending'  ? 'This loan application is currently under review.'
        : loan.status === 'approved' ? 'This loan has been approved but not yet disbursed. Payments will be accepted once funds are released.'
        : 'This loan is not open for payment processing at this time.',
    }
} else if (!nextInstallment || outstanding <= 0) {
    blocked = {
      title: 'You\'re all paid up! 🎉',
      body: 'Every installment on this loan has been settled. Your repayment record is looking great — keep it up!',
    }
  }

const installmentDue = blocked
    ? 0
    : Math.max(0, Number(nextInstallment!.amount_due) + Number(nextInstallment!.late_fee ?? 0) - Number(nextInstallment!.amount_paid))

  const payAction = blocked ? null : submitPayment.bind(null, id, nextInstallment!.id)
  const progressPct = Math.min(100, Math.round((totalPaid / Number(loan.total_repayable || 1)) * 100))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }
        body { font-family:'Inter',-apple-system,sans-serif; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono  { font-family:'Space Mono',monospace; }

        .ledger-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:6px; position:relative; }
        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px);
          background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }

        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace; font-size:11px;
          font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:4px 10px; border-radius:3px;
          border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }

        .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:4px;
          background:var(--marigold); color:var(--teal-dark); font-size:14px; font-weight:700;
          text-decoration:none; border:1.5px solid var(--ink); box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease;
          cursor:pointer; width:100%; justify-content:center; }
        .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; box-shadow:3px 3px 0 var(--ink); }

        .btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:4px;
          color:var(--ink-2); font-size:13px; font-weight:600; text-decoration:none;
          border:1.5px solid var(--line-md); background:var(--card); transition:all 0.15s ease; }
        .btn-ghost:hover { border-color:var(--teal); color:var(--teal); background:var(--teal-bg); }

        .progress-track { height:10px; border-radius:2px; background:var(--paper-2); overflow:hidden; border:1px solid var(--line-md); }
        .progress-fill { height:100%; background:repeating-linear-gradient(135deg,var(--teal),var(--teal) 8px,var(--teal-dark) 8px,var(--teal-dark) 16px); transition:width 0.6s ease; }

        .summary-row { display:flex; justify-content:space-between; align-items:center; padding:14px 24px;
          border-bottom:1px dashed var(--line); font-size:14px; }
        .summary-row:last-child { border-bottom:none; }

        .field-label { display:block; font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
          letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-4); margin-bottom:12px; }

        .amount-input-wrap { position:relative; }
        .amount-prefix { position:absolute; left:16px; top:50%; transform:translateY(-50%);
          font-family:'Fraunces',Georgia,serif; font-size:24px; color:var(--ink-3); pointer-events:none; }
        .amount-input { width:100%; padding:18px 16px 18px 38px; font-family:'Fraunces',Georgia,serif; font-size:28px;
          color:var(--ink); background:var(--paper-2); border:1.5px solid var(--line-md); border-radius:4px;
          outline:none; transition:border-color 0.15s ease; -moz-appearance:textfield; }
        .amount-input::-webkit-inner-spin-button, .amount-input::-webkit-outer-spin-button { -webkit-appearance:none; }
        .amount-input:focus { border-color:var(--teal); background:var(--card); }

        .quick-fill-btn { font-family:'Space Mono',monospace; font-size:12px; padding:6px 12px; border-radius:3px;
          border:1.5px solid; cursor:pointer; background:transparent; transition:opacity 0.15s ease; }
        .quick-fill-btn:hover { opacity:0.7; }

        .channel-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; }
        .channel-option input { display:none; }
        .channel-label { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px 10px;
          border-radius:4px; cursor:pointer; border:1.5px solid var(--line-md); background:var(--card);
          font-size:13px; font-weight:600; color:var(--ink-2); transition:all 0.15s ease; text-align:center; user-select:none; }
        .channel-label:hover { border-color:var(--teal); background:var(--teal-bg); }
        .channel-option input:checked + .channel-label { border-color:var(--teal); background:var(--teal-bg); color:var(--teal-dark); }
        .channel-icon { font-size:22px; }

        .installment-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:3px;
          font-family:'Space Mono',monospace; font-size:11px; font-weight:700; border:1.5px solid; }

        .empty-state { text-align:center; padding:64px 24px; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <Link href="/dashboard" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 13, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link href={`/loans/${id}`} className="btn-ghost">← Loan details</Link>
        </header>

        <main className="max-w-lg mx-auto px-6 sm:px-10 py-10">
{blocked ? (
            <div className="ledger-card empty-state" style={{
              background: (!nextInstallment || outstanding <= 0) ? 'var(--teal-bg)' : 'var(--card)',
              borderColor: (!nextInstallment || outstanding <= 0) ? 'var(--teal-bdr)' : 'var(--line-md)',
            }}>
              <div className="font-display mb-3" style={{ fontSize: 48, lineHeight: 1 }}>
                {(!nextInstallment || outstanding <= 0) ? '✓' : '⚠'}
              </div>
              <p className="font-display text-2xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {blocked.title}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-3)', maxWidth: 320, margin: '0 auto 24px' }}>
                {blocked.body}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/loans/${id}`} className="btn-ghost" style={{ display: 'inline-flex' }}>
                  Back to loan details
                </Link>
                {(!nextInstallment || outstanding <= 0) && (
                  <Link href="/dashboard" className="btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
                    Go to dashboard →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Make a payment
              </h1>
              <p className="font-mono text-xs mb-6" style={{ color: 'var(--ink-3)' }}>
                Installment {nextInstallment!.installment_number} of {(installments ?? []).length}
              </p>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2 font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                  <span>{peso(totalPaid)} paid</span>
                  <span>{peso(Number(loan.total_repayable))} total</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="ledger-card overflow-hidden mb-8">
                <div className="punch-line" />
                <div className="summary-row">
                  <span style={{ color: 'var(--ink-3)' }}>Outstanding balance</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                    {peso(outstanding)}
                  </span>
                </div>
                <div className="summary-row">
                  <span style={{ color: 'var(--ink-3)' }}>This installment</span>
                  <span
                    className="installment-badge"
                    style={{
                      color: nextInstallment!.status === 'overdue' ? 'var(--magenta)' : 'var(--teal-dark)',
                      borderColor: nextInstallment!.status === 'overdue' ? 'var(--magenta)' : 'var(--teal)',
                    }}
                  >
                    #{nextInstallment!.installment_number} · due {formatDate(nextInstallment!.due_date)}
                  </span>
                </div>
                <div className="summary-row">
                  <span style={{ color: 'var(--ink-3)' }}>Amount due this installment</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                    {peso(installmentDue)}
                  </span>
                </div>
                {Number(nextInstallment!.amount_paid) > 0 && (
                  <div className="summary-row">
                    <span style={{ color: 'var(--ink-3)' }}>Already paid on this</span>
                    <span className="font-mono" style={{ color: 'var(--teal-dark)' }}>
                      {peso(Number(nextInstallment!.amount_paid))}
                    </span>
                  </div>
                )}
              </div>

              <PaymentFlow
                loanId={id}
                installmentDue={installmentDue}
                outstanding={outstanding}
                installmentNumber={nextInstallment!.installment_number}
                payAction={payAction!}
              />
            </>
          )}
        </main>
      </div>
    </>
  )
}