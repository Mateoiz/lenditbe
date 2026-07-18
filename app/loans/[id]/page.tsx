// app/loans/[id]/page.tsx
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatDateLong(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: 'Under Review',  bg: 'var(--amber-bg)',  color: 'var(--amber)',    border: 'var(--amber-bdr)' },
  approved:  { label: 'Approved',      bg: 'var(--blue-bg)',   color: 'var(--blue-mid)', border: 'var(--blue-bdr)' },
  disbursed: { label: 'Disbursed',     bg: 'var(--blue-bg)',   color: 'var(--blue-mid)', border: 'var(--blue-bdr)' },
  active:    { label: 'Active',        bg: 'var(--green-bg)',  color: 'var(--green)',    border: 'var(--green-bdr)' },
  completed: { label: 'Completed',     bg: 'var(--green-bg)',  color: 'var(--green)',    border: 'var(--green-bdr)' },
  overdue:   { label: 'Overdue',       bg: 'var(--red-bg)',    color: 'var(--red)',      border: 'var(--red-bdr)' },
  defaulted: { label: 'Defaulted',     bg: 'var(--red-bg)',    color: 'var(--red)',      border: 'var(--red-bdr)' },
  rejected:  { label: 'Not Approved',  bg: '#F8FAFC',          color: 'var(--ink-3)',    border: 'var(--line-md)' },
}

const INST_META: Record<string, { label: string; color: string; dot: string }> = {
  upcoming: { label: 'Upcoming', color: 'var(--ink-3)',   dot: 'var(--ink-4)' },
  due:      { label: 'Due',      color: 'var(--amber)',   dot: 'var(--amber)' },
  paid:     { label: 'Paid',     color: 'var(--green)',   dot: 'var(--green)' },
  overdue:  { label: 'Overdue',  color: 'var(--red)',     dot: 'var(--red)' },
}

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: installments } = await supabase
    .from('loan_installments')
    .select('*')
    .eq('loan_id', id)
    .order('installment_number', { ascending: true })

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', id)
    .order('paid_at', { ascending: false })

  const allInstallments = installments ?? []
  const allPayments = payments ?? []

  const paidCount = allInstallments.filter(i => i.status === 'paid').length
  const totalCount = allInstallments.length
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  const amountPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const remaining  = Math.max(0, Number(loan.total_repayable) - amountPaid)

  const meta = STATUS_META[loan.status] ?? STATUS_META.rejected
  const canPay = ['active', 'disbursed', 'approved', 'overdue'].includes(loan.status)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        :root {
          --bg:#F4F6FB; --bg-2:#EAEEF6; --bg-card:#FFFFFF;
          --ink:#0F172A; --ink-2:#334155; --ink-3:#64748B; --ink-4:#94A3B8;
          --blue:#4F46E5; --blue-mid:#6366F1; --blue-bg:#EEF2FF; --blue-bdr:#C7D2FE;
          --line:rgba(15,23,42,0.06); --line-md:rgba(15,23,42,0.12);
          --amber:#D97706; --amber-bg:#FFFBEB; --amber-bdr:#FDE68A;
          --green:#059669; --green-bg:#ECFDF5; --green-bdr:#6EE7B7;
          --red:#E11D48; --red-bg:#FFF1F2; --red-bdr:#FECDD3;
        }
        body { font-family:'Plus Jakarta Sans',-apple-system,sans-serif; }
        .font-serif { font-family:'DM Serif Display',Georgia,serif; }
        .font-mono  { font-family:'JetBrains Mono',monospace; }
        .card { background:var(--bg-card); border:1px solid var(--line); border-radius:20px;
          box-shadow:0 10px 30px -5px rgba(15,23,42,0.04),0 4px 10px -3px rgba(15,23,42,0.02); }
        .stat-card { background:var(--bg-card); border:1px solid var(--line); border-radius:16px; padding:20px 24px; }
        .status-pill { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:500;
          padding:3px 10px; border-radius:999px; border:1px solid; }
        .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:12px;
          background:linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%); color:#fff; font-size:14px; font-weight:600;
          text-decoration:none; border:none; box-shadow:0 4px 14px 0 rgba(99,102,241,0.35);
          transition:all 0.2s ease; }
        .btn-primary:hover { background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%); transform:translateY(-1px); }
        .btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:12px;
          color:var(--ink-2); font-size:13px; font-weight:600; text-decoration:none;
          border:1px solid var(--line-md); background:var(--bg-card); transition:all 0.15s ease; }
        .btn-ghost:hover { background:var(--bg-2); border-color:var(--ink-3); }
        .progress-track { height:6px; border-radius:999px; background:var(--bg-2); overflow:hidden; }
        .progress-fill  { height:100%; border-radius:999px;
          background:linear-gradient(90deg,#6366F1,#8B5CF6); transition:width 0.6s ease; }
        .inst-row { display:flex; align-items:center; gap:12px; padding:14px 24px;
          border-bottom:1px solid var(--line); }
        .inst-row:last-child { border-bottom:none; }
        .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .section-label { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500;
          letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-4); margin-bottom:12px; }
        .divider { border:none; border-top:1px solid var(--line); margin:28px 0; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <header className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-card)' }}>
          <Link href="/dashboard" className="font-serif text-xl" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
            Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
          </Link>
          <Link href="/loans" className="btn-ghost">← All loans</Link>
        </header>

        <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">

          {/* Title + status */}
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="font-serif text-4xl" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
                  {peso(loan.principal_amount)}
                </h1>
                <span className="status-pill" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                  {meta.label}
                </span>
              </div>
              <p className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                Applied {formatDateLong(loan.applied_at)}
                {loan.due_date && ` · Due ${formatDate(loan.due_date)}`}
              </p>
            </div>
            {canPay && (
              <Link href={`/loans/${loan.id}/pay`} className="btn-primary">
                Make a payment
              </Link>
            )}
          </div>

          {/* Rejection reason */}
          {loan.status === 'rejected' && loan.rejection_reason && (
            <div className="rounded-xl px-5 py-4 mb-6"
              style={{ background: 'var(--red-bg)', border: '1px solid var(--red-bdr)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--red)' }}>Application not approved</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{loan.rejection_reason}</p>
            </div>
          )}

          {/* Progress bar (only for active loans with installments) */}
          {totalCount > 0 && loan.status !== 'rejected' && (
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Repayment progress</span>
                <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>{paidCount}/{totalCount} installments</span>
              </div>
              <div className="progress-track mb-3">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                <span>Paid: {peso(amountPaid)}</span>
                <span>Remaining: {peso(remaining)}</span>
              </div>
            </div>
          )}

          {/* Loan breakdown stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Principal',     value: peso(loan.principal_amount) },
              { label: 'Total repayable', value: peso(loan.total_repayable) },
              { label: 'Interest rate',  value: `${loan.interest_rate}% p.a.` },
              { label: 'Term',           value: `${loan.term_days} days` },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                  {stat.label}
                </p>
                <p className="font-serif text-lg" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="card p-6 mb-8">
            <p className="section-label">Fee breakdown</p>
            <div className="space-y-3">
              {[
                { label: 'Principal amount',  value: peso(loan.principal_amount) },
                { label: 'Interest',          value: peso(loan.total_interest) },
                { label: 'Service fee',       value: peso(loan.principal_amount * loan.service_fee_rate / 100) },
                { label: 'Processing fee',    value: peso(loan.processing_fee) },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex justify-between font-mono text-sm py-2 ${i < arr.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  <span>{row.label}</span>
                  <span style={{ color: 'var(--ink)' }}>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between font-mono text-sm pt-2 font-semibold"
                style={{ borderTop: '2px solid var(--line-md)', color: 'var(--ink)' }}>
                <span>Total repayable</span>
                <span>{peso(loan.total_repayable)}</span>
              </div>
            </div>
          </div>

          {/* Installment schedule */}
          {allInstallments.length > 0 && (
            <div className="mb-8">
              <p className="section-label">Payment schedule</p>
              <div className="card overflow-hidden">
                {allInstallments.map(inst => {
                  const im = INST_META[inst.status] ?? INST_META.upcoming
                  return (
                    <div key={inst.id} className="inst-row">
                      <div className="dot" style={{ background: im.dot }} />
                      <div style={{ flex: 1 }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          Installment {inst.installment_number}
                          <span className="font-mono text-xs ml-2" style={{ color: im.color }}>
                            {im.label}
                          </span>
                        </p>
                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                          Due {formatDate(inst.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          {peso(inst.amount_due)}
                        </p>
                        {inst.amount_paid > 0 && (
                          <p className="font-mono text-xs" style={{ color: 'var(--green)' }}>
                            Paid {peso(inst.amount_paid)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Payment history */}
          {allPayments.length > 0 && (
            <div>
              <p className="section-label">Payment history</p>
              <div className="card overflow-hidden">
                {allPayments.map(p => (
                  <div key={p.id} className="inst-row">
                    <div className="dot" style={{ background: 'var(--green)' }} />
                    <div style={{ flex: 1 }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Payment received</p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        {formatDateLong(p.paid_at)} · {p.channel ?? 'unspecified'}
                        {p.reference_number && ` · Ref: ${p.reference_number}`}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-medium" style={{ color: 'var(--green)' }}>
                      {peso(p.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  )
}