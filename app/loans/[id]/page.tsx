// app/loans/[id]/page.tsx
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoanConfirmedAnimation from './LoanConfirmedAnimation'

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

const STATUS_META: Record<string, { label: string; color: string; border: string }> = {
  pending:   { label: 'Under review',  color: 'var(--marigold-dark)', border: 'var(--marigold)' },
  approved:  { label: 'Approved',      color: 'var(--teal-dark)',     border: 'var(--teal)' },
  disbursed: { label: 'Disbursed',     color: 'var(--teal-dark)',     border: 'var(--teal)' },
  active:    { label: 'Active',        color: 'var(--teal-dark)',     border: 'var(--teal)' },
  completed: { label: 'Paid',          color: 'var(--teal-dark)',     border: 'var(--teal)' },
  overdue:   { label: 'Overdue',       color: 'var(--magenta)',       border: 'var(--magenta)' },
  defaulted: { label: 'Defaulted',     color: 'var(--magenta)',       border: 'var(--magenta)' },
  rejected:  { label: 'Not approved',  color: 'var(--ink-3)',         border: 'var(--line-md)' },
}

const INST_META: Record<string, { label: string; color: string; dot: string }> = {
  upcoming: { label: 'Upcoming', color: 'var(--ink-3)',         dot: 'var(--ink-4)' },
  due:      { label: 'Due',      color: 'var(--marigold-dark)', dot: 'var(--marigold)' },
  paid:     { label: 'Paid',     color: 'var(--teal-dark)',     dot: 'var(--teal)' },
  overdue:  { label: 'Overdue',  color: 'var(--magenta)',       dot: 'var(--magenta)' },
}

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ applied?: string }>
}) {
  const { id } = await params
  const { applied } = await searchParams
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

  // Reconcile late fees against actual due_date before showing the schedule
  await supabase.rpc('apply_late_fees_for_loan', { p_loan_id: id })

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
  const totalLateFees = allInstallments.reduce((sum, i) => sum + Number(i.late_fee ?? 0), 0)
  const remaining  = Math.max(0, Number(loan.total_repayable) + totalLateFees - amountPaid)

  const meta = STATUS_META[loan.status] ?? STATUS_META.rejected
const canPay = ['active', 'disbursed', 'approved', 'overdue'].includes(loan.status) && remaining > 0

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
        .stat-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:4px; padding:20px 24px; }
        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace; font-size:11px;
          font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:4px 10px; border-radius:3px;
          border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }
        .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:4px;
          background:var(--marigold); color:var(--teal-dark); font-size:14px; font-weight:700;
          text-decoration:none; border:1.5px solid var(--ink); box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease; }
        .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:4px;
          color:var(--ink-2); font-size:13px; font-weight:600; text-decoration:none;
          border:1.5px solid var(--line-md); background:var(--card); transition:all 0.15s ease; }
        .btn-ghost:hover { border-color:var(--teal); color:var(--teal); background:var(--teal-bg); }
        .progress-track { height:10px; border-radius:2px; background:var(--paper-2); overflow:hidden; border:1px solid var(--line-md); }
        .progress-fill { height:100%; background:repeating-linear-gradient(135deg,var(--teal),var(--teal) 8px,var(--teal-dark) 8px,var(--teal-dark) 16px); transition:width 0.6s ease; }
        .inst-row { display:flex; align-items:center; gap:12px; padding:14px 24px; border-bottom:1px dashed var(--line); }
        .inst-row:last-child { border-bottom:none; }
        .dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
        .section-label { font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
          letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-4); margin-bottom:12px; }
      `}</style>

{applied === '1' && <LoanConfirmedAnimation amount={peso(loan.principal_amount)} />}

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
          <Link href="/loans" className="btn-ghost">← All loans</Link>
        </header>

        <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">

          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="font-display text-4xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {peso(loan.principal_amount)}
                </h1>
                <span className="stamp" style={{ color: meta.color, borderColor: meta.border }}>
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

          {loan.status === 'rejected' && loan.rejection_reason && (
            <div className="ledger-card px-5 py-4 mb-6" style={{ background: 'var(--magenta-bg)', borderColor: 'var(--magenta-bdr)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--magenta)' }}>Application not approved</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{loan.rejection_reason}</p>
            </div>
          )}

          {totalCount > 0 && loan.status !== 'rejected' && (
            <div className="ledger-card p-6 mb-6">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Principal',       value: peso(loan.principal_amount) },
              { label: 'Total repayable', value: peso(loan.total_repayable) },
              { label: 'Interest rate',   value: `${loan.interest_rate}% one-time` },
              { label: 'Term',            value: `${loan.term_days} days` },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                  {stat.label}
                </p>
                <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="ledger-card overflow-hidden mb-8">
            <div className="punch-line" />
            <div className="p-6">
              <p className="section-label">Fee breakdown</p>
              <div>
{[
                  { label: 'Principal amount', value: peso(loan.principal_amount) },
                  { label: 'Interest',         value: peso(loan.total_interest) },
                  { label: 'Service fee',      value: peso(loan.principal_amount * loan.service_fee_rate / 100) },
                  { label: 'Processing fee',   value: peso(loan.processing_fee) },
                  ...(totalLateFees > 0 ? [{ label: 'Late fees', value: peso(totalLateFees) }] : []),
                ].map((row, i, arr) => (
                  <div key={row.label}
                    className={`flex justify-between font-mono text-sm py-2 ${i < arr.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: 'var(--line)', color: row.label === 'Late fees' ? 'var(--magenta)' : 'var(--ink-2)' }}>
                    <span>{row.label}</span>
                    <span style={{ color: row.label === 'Late fees' ? 'var(--magenta)' : 'var(--ink)' }}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-mono text-sm pt-3 font-semibold"
                  style={{ borderTop: '2px solid var(--ink)', color: 'var(--ink)', marginTop: 4 }}>
                  <span>Total repayable{totalLateFees > 0 ? ' (incl. late fees)' : ''}</span>
                  <span>{peso(Number(loan.total_repayable) + totalLateFees)}</span>
                </div>
              </div>
            </div>
          </div>

          {allInstallments.length > 0 && (() => {
            // Split into "settled" (fully paid) vs "open" (still owed, in
            // any order/amount — early or partial payments are still fine,
            // this split is purely about what's left to reorganize the list
            // around, not about restricting how installments get paid).
const openInstallments = allInstallments
              .filter(i => Math.round((Number(i.amount_due) + Number(i.late_fee ?? 0) - Number(i.amount_paid)) * 100) / 100 >= 0.05)
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
const paidInstallments = allInstallments
              .filter(i => Math.round((Number(i.amount_due) + Number(i.late_fee ?? 0) - Number(i.amount_paid)) * 100) / 100 < 0.05)
              .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

            const nextDue = openInstallments[0] ?? null
            const laterOpen = openInstallments.slice(1)

            return (
              <div className="mb-8">
                <p className="section-label">Payment schedule</p>

                {/* Next payment — pulled out and highlighted so it's the
                    first thing anyone sees, instead of buried in a flat list */}
                {nextDue && (
                  <div
                    className="ledger-card p-5 mb-4"
                    style={{
                      borderColor: nextDue.status === 'overdue' ? 'var(--magenta)' : 'var(--marigold)',
                      background: nextDue.status === 'overdue' ? 'var(--magenta-bg)' : 'var(--marigold-bg)',
                    }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest mb-1"
                          style={{ color: nextDue.status === 'overdue' ? 'var(--magenta)' : 'var(--marigold-dark)' }}>
                          Next payment · Installment {nextDue.installment_number}
                        </p>
<p className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                          {peso(Number(nextDue.amount_due) + Number(nextDue.late_fee ?? 0) - Number(nextDue.amount_paid))}
                        </p>
                        <p className="font-mono text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                          Due {formatDate(nextDue.due_date)}
                          {Number(nextDue.amount_paid) > 0 && ` · ${peso(Number(nextDue.amount_paid))} already paid toward this`}
                        </p>
                      </div>
                      {canPay && (
                        <Link href={`/loans/${loan.id}/pay`} className="btn-primary">
                          Pay now
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Remaining upcoming installments — grouped together,
                    ordered by due date, kept visually secondary to the
                    highlighted next payment above */}
                {laterOpen.length > 0 && (
                  <div className="mb-4">
                    <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
                      Upcoming ({laterOpen.length})
                    </p>
                    <div className="ledger-card overflow-hidden">
                      <div className="punch-line" />
                      {laterOpen.map(inst => {
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
                                {peso(Number(inst.amount_due) + Number(inst.late_fee ?? 0) - Number(inst.amount_paid))}
                              </p>
                              {Number(inst.late_fee ?? 0) > 0 && (
                                <p className="font-mono text-xs" style={{ color: 'var(--magenta)' }}>
                                  +{peso(Number(inst.late_fee))} late fee
                                </p>
                              )}
                              {Number(inst.amount_paid) > 0 && (
                                <p className="font-mono text-xs" style={{ color: 'var(--teal-dark)' }}>
                                  {peso(Number(inst.amount_paid))} paid
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Fully paid installments — collapsed into their own
                    section at the bottom so they don't compete for
                    attention with what's still owed */}
                {paidInstallments.length > 0 && (
                  <details>
                    <summary
                      className="font-mono text-xs uppercase tracking-widest mb-2 cursor-pointer select-none"
                      style={{ color: 'var(--ink-4)' }}
                    >
                      Paid ({paidInstallments.length})
                    </summary>
                    <div className="ledger-card overflow-hidden mt-2">
                      <div className="punch-line" />
                      {paidInstallments.map(inst => (
                        <div key={inst.id} className="inst-row">
                          <div className="dot" style={{ background: 'var(--teal)' }} />
                          <div style={{ flex: 1 }}>
                            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                              Installment {inst.installment_number}
                              <span className="font-mono text-xs ml-2" style={{ color: 'var(--teal-dark)' }}>
                                Paid
                              </span>
                            </p>
                            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                              Due {formatDate(inst.due_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>
                              {peso(Number(inst.amount_paid))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })()}

          {allPayments.length > 0 && (
            <div>
              <p className="section-label">Payment history</p>
              <div className="ledger-card overflow-hidden">
                <div className="punch-line" />
                {allPayments.map(p => (
                  <div key={p.id} className="inst-row">
                    <div className="dot" style={{ background: 'var(--teal)' }} />
                    <div style={{ flex: 1 }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Payment received</p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        {formatDateLong(p.paid_at)} · {p.channel ?? 'unspecified'}
                        {p.reference_number && ` · Ref: ${p.reference_number}`}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-medium" style={{ color: 'var(--teal-dark)' }}>
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