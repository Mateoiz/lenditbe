'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { approveKyc, rejectKyc, getKycDocUrls } from './actions'

// ── Types ──
interface Borrower {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  employment_type: string | null
  monthly_income: number | null
  guardian_monthly_income: number | null
  id_type: string | null
  id_number: string | null
  mobile_number: string | null
  birth_date: string | null
  city: string | null
  province: string | null
  kyc_status: string
  credit_limit: number
  updated_at: string
}

interface ReviewedBorrower {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  kyc_status: string
  credit_limit: number
  employment_type: string | null
  updated_at: string
}

interface Props {
  adminEmail: string
  adminRole: string
  pendingBorrowers: Borrower[]
  reviewedBorrowers: ReviewedBorrower[]
}

const EMPLOYMENT_RATES: Record<string, number> = {
  employed: 0.30,
  business_owner: 0.25,
  self_employed: 0.20,
  freelance: 0.15,
  student: 0.20,
  unemployed: 0.10,
}

function computeSuggestedLimit(b: Borrower): number {
  const isStudent = b.employment_type === 'student'
  const income = isStudent
    ? (b.guardian_monthly_income ?? 0)
    : (b.monthly_income ?? 0)
  const rate = EMPLOYMENT_RATES[b.employment_type ?? ''] ?? 0.10
  const raw = Math.floor(income * rate)
  return Math.min(50_000, Math.max(1_000, raw))
}

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function idTypeLabel(t: string | null) {
  const map: Record<string, string> = {
    philsys: 'PhilSys', passport: 'Passport', drivers_license: "Driver's License",
    umid: 'UMID', sss: 'SSS ID', tin: 'TIN ID', postal_id: 'Postal ID', voters_id: "Voter's ID",
  }
  return t ? (map[t] ?? t) : '—'
}

// ── Single KYC Card ──
function KycCard({ borrower, onDone }: { borrower: Borrower; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [docs, setDocs] = useState<{ front: string | null; back: string | null; selfie: string | null } | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [creditLimit, setCreditLimit] = useState(computeSuggestedLimit(borrower))
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  const suggested = computeSuggestedLimit(borrower)
  const isStudent = borrower.employment_type === 'student'
  const income = isStudent ? borrower.guardian_monthly_income : borrower.monthly_income

  async function loadDocs() {
    if (docs) return
    setDocsLoading(true)
    setDocsError('')
    const result = await getKycDocUrls(borrower.id)
    setDocsLoading(false)
    if (result.ok) setDocs(result.urls)
    else setDocsError('Failed to load documents.')
  }

  function handleApprove() {
    setActionError('')
    startTransition(async () => {
      const result = await approveKyc(borrower.id, creditLimit)
      if (result.ok) { setDone('approved'); setTimeout(onDone, 1200) }
      else setActionError(result.error)
    })
  }

  function handleReject() {
    if (!rejectReason.trim()) { setActionError('Please enter a rejection reason.'); return }
    setActionError('')
    startTransition(async () => {
      const result = await rejectKyc(borrower.id, rejectReason)
      if (result.ok) { setDone('rejected'); setTimeout(onDone, 1200) }
      else setActionError(result.error)
    })
  }

  if (done) {
    return (
      <div className="kyc-card" style={{
        background: done === 'approved' ? 'var(--teal-bg)' : 'var(--magenta-bg)',
        borderColor: done === 'approved' ? 'var(--teal-bdr)' : 'var(--magenta-bdr)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>{done === 'approved' ? '✓' : '✕'}</span>
        <span className="font-mono text-sm font-bold" style={{ color: done === 'approved' ? 'var(--teal-dark)' : 'var(--magenta)' }}>
          {done === 'approved' ? `Approved — ${peso(creditLimit)} limit set` : 'Rejected'}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Document" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 6, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="fixed top-5 right-5 font-mono text-sm px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>✕ Close</button>
        </div>
      )}

      <div className="kyc-card">
        {/* Card header */}
        <div className="kyc-card-header">
          <div>
            <p className="font-display text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {borrower.first_name} {borrower.last_name}
            </p>
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{borrower.email}</p>
          </div>
          <div className="text-right">
            <span className="queue-badge">PENDING REVIEW</span>
            <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--ink-4)' }}>Submitted {formatDate(borrower.updated_at)}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="info-grid">
          {[
            { label: 'Employment', value: borrower.employment_type ?? '—' },
            { label: isStudent ? 'Guardian income' : 'Monthly income', value: income ? peso(income) : '—' },
            { label: 'Suggested limit', value: peso(suggested) },
            { label: 'ID type', value: idTypeLabel(borrower.id_type) },
            { label: 'ID number', value: borrower.id_number ?? '—' },
            { label: 'Mobile', value: borrower.mobile_number ?? '—' },
            { label: 'Location', value: [borrower.city, borrower.province].filter(Boolean).join(', ') || '—' },
            { label: 'Birthdate', value: formatDate(borrower.birth_date) },
          ].map(f => (
            <div key={f.label}>
              <p className="field-label">{f.label}</p>
              <p className="field-value">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Document section */}
        <div className="doc-section">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>KYC Documents</p>
            {!docs && (
              <button onClick={loadDocs} disabled={docsLoading} className="doc-load-btn">
                {docsLoading ? 'Loading…' : '🔍 Load documents'}
              </button>
            )}
          </div>

          {docsError && <p className="text-xs" style={{ color: 'var(--magenta)' }}>{docsError}</p>}

          {docs && (
            <div className="doc-grid">
              {[
                { label: 'ID FRONT', url: docs.front },
                { label: 'ID BACK', url: docs.back },
                { label: 'SELFIE', url: docs.selfie },
              ].map(doc => (
                <div key={doc.label} className="doc-thumb-wrap">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-4)' }}>{doc.label}</p>
                  {doc.url ? (
                    <button onClick={() => setLightbox(doc.url!)} className="doc-thumb" style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', display: 'block', width: '100%' }}>
                      <img src={doc.url} alt={doc.label} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 4, border: '1.5px solid var(--line-md)', display: 'block' }} />
                      <p className="font-mono text-[9px] mt-1.5 text-center" style={{ color: 'var(--teal)' }}>Click to enlarge</p>
                    </button>
                  ) : (
                    <div style={{ height: 110, borderRadius: 4, border: '1.5px dashed var(--line-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-4)' }}>Not provided</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="action-section">
          {actionError && (
            <p className="text-xs mb-3 px-3 py-2 rounded" style={{ background: 'var(--magenta-bg)', color: 'var(--magenta)', border: '1px solid var(--magenta-bdr)' }}>
              {actionError}
            </p>
          )}

          {!showReject ? (
            <div className="flex flex-col gap-3">
              {/* Credit limit adjuster */}
              <div className="limit-adjuster">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>Credit limit to set</p>
                  <p className="font-display text-lg" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>{peso(creditLimit)}</p>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={500}
                  value={creditLimit}
                  onChange={e => setCreditLimit(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--teal)' }}
                />
                <div className="flex justify-between font-mono text-[9px] mt-1" style={{ color: 'var(--ink-4)' }}>
                  <span>₱1,000</span>
                  <span style={{ color: 'var(--teal)' }}>Suggested: {peso(suggested)}</span>
                  <span>₱50,000</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="btn-approve"
                >
                  {isPending ? 'Approving…' : '✓ Approve KYC'}
                </button>
                <button
                  onClick={() => { setShowReject(true); setActionError('') }}
                  disabled={isPending}
                  className="btn-reject-toggle"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--magenta)' }}>Rejection reason</p>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. ID photo is blurry, face not clearly visible…"
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 4,
                    border: '1.5px solid var(--magenta-bdr)', background: 'var(--magenta-bg)',
                    color: 'var(--ink)', fontSize: 13, fontFamily: 'Inter, sans-serif',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={isPending} className="btn-reject-confirm">
                  {isPending ? 'Rejecting…' : '✕ Confirm rejection'}
                </button>
                <button onClick={() => { setShowReject(false); setActionError('') }} disabled={isPending} className="btn-reject-toggle">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main component ──
export default function KycQueue({ adminEmail, adminRole, pendingBorrowers, reviewedBorrowers }: Props) {
  const [queue, setQueue] = useState(pendingBorrowers)
  const [tab, setTab] = useState<'queue' | 'reviewed'>('queue')

  function removeFromQueue(id: string) {
    setQueue(q => q.filter(b => b.id !== id))
  }

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
        * { box-sizing: border-box; }
        body { font-family:'Inter',-apple-system,sans-serif; background:var(--paper); color:var(--ink); }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono { font-family:'Space Mono',monospace; }

        .kyc-card {
          background:var(--card); border:1.5px solid var(--line-md); border-radius:6px;
          overflow:hidden; transition:box-shadow 0.2s ease;
        }
        .kyc-card:hover { box-shadow:0 4px 24px rgba(20,17,15,0.07); }
        .kyc-card-header {
          display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
          padding:20px 22px 16px; border-bottom:1.5px solid var(--line);
        }
        .queue-badge {
          display:inline-flex; align-items:center; padding:3px 8px; border-radius:3px;
          font-family:'Space Mono',monospace; font-size:9px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.08em;
          background:var(--marigold-bg); color:var(--marigold-dark); border:1px solid var(--marigold-bdr);
        }
        .info-grid {
          display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:0;
          padding:0; border-bottom:1.5px solid var(--line);
        }
        .info-grid > div {
          padding:12px 22px; border-right:1px solid var(--line); border-bottom:1px solid var(--line);
        }
        .info-grid > div:nth-child(even) { border-right:none; }
        .field-label { font-family:'Space Mono',monospace; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-4); margin-bottom:4px; }
        .field-value { font-size:13px; font-weight:600; color:var(--ink); }

        .doc-section { padding:18px 22px; border-bottom:1.5px solid var(--line); }
        .doc-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .doc-load-btn {
          font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
          padding:5px 12px; border-radius:3px; cursor:pointer;
          border:1.5px solid var(--line-md); background:var(--paper-2); color:var(--ink-3);
          transition:all 0.15s ease;
        }
        .doc-load-btn:hover { border-color:var(--teal); color:var(--teal-dark); background:var(--teal-bg); }

        .action-section { padding:18px 22px; background:var(--paper); }
        .limit-adjuster {
          padding:14px 16px; border-radius:4px;
          border:1.5px solid var(--teal-bdr); background:var(--teal-bg); margin-bottom:0;
        }

        .btn-approve {
          flex:1; display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:11px 20px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer;
          background:var(--teal); color:#fff; border:1.5px solid var(--teal-dark);
          box-shadow:2px 2px 0 var(--teal-dark); transition:all 0.15s ease;
        }
        .btn-approve:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:3px 3px 0 var(--teal-dark); }
        .btn-approve:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; transform:none; }

        .btn-reject-toggle {
          display:inline-flex; align-items:center; justify-content:center;
          padding:11px 18px; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;
          background:var(--card); color:var(--ink-3);
          border:1.5px solid var(--line-md); transition:all 0.15s ease;
        }
        .btn-reject-toggle:hover:not(:disabled) { border-color:var(--magenta); color:var(--magenta); background:var(--magenta-bg); }
        .btn-reject-toggle:disabled { opacity:0.5; cursor:not-allowed; }

        .btn-reject-confirm {
          flex:1; display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:11px 20px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer;
          background:var(--magenta); color:#fff; border:1.5px solid #9A1647;
          box-shadow:2px 2px 0 #9A1647; transition:all 0.15s ease;
        }
        .btn-reject-confirm:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:3px 3px 0 #9A1647; }
        .btn-reject-confirm:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; transform:none; }

        .tab-btn {
          padding:8px 20px; border-radius:4px 4px 0 0; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
          cursor:pointer; border:1.5px solid transparent; border-bottom:none; transition:all 0.15s ease;
          background:transparent; color:var(--ink-4);
        }
        .tab-btn.active {
          background:var(--card); border-color:var(--line-md); color:var(--ink);
          position:relative; top:1.5px;
        }

        .reviewed-row {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:14px 18px; border-bottom:1px dashed var(--line);
        }
        .status-pill {
          display:inline-flex; align-items:center; padding:3px 9px; border-radius:3px;
          font-family:'Space Mono',monospace; font-size:9px; font-weight:700; text-transform:uppercase;
        }

        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px); background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        {/* Header */}
        <header style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <div className="max-w-5xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'none' }}>
                Lendit
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background:'var(--marigold)', color:'var(--teal-dark)', fontSize:13, fontWeight:700, marginLeft:2, border:'1.5px solid var(--ink)', verticalAlign:'middle' }}>Be</span>
              </Link>
              <span style={{ color: 'var(--ink-4)' }}>/</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--line-md)' }}>
                Admin
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs hidden sm:inline" style={{ color: 'var(--ink-4)' }}>{adminEmail}</span>
              <span className="font-mono text-[9px] font-bold uppercase px-2 py-1 rounded" style={{ background: 'var(--teal-bg)', color: 'var(--teal-dark)', border: '1px solid var(--teal-bdr)' }}>{adminRole}</span>
              <form action="/auth/signout" method="post">
                <button type="submit" className="font-mono text-xs px-3 py-1.5 rounded" style={{ color: 'var(--ink-3)', border: '1px solid var(--line-md)' }}>Sign out</button>
              </form>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
          {/* Page title */}
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>KYC Review Queue</p>
            <div className="flex items-end justify-between gap-4">
              <h1 className="font-display text-4xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Identity Verification
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="font-mono text-xs px-3 py-2 rounded" style={{ background: queue.length > 0 ? 'var(--marigold-bg)' : 'var(--teal-bg)', border: `1.5px solid ${queue.length > 0 ? 'var(--marigold-bdr)' : 'var(--teal-bdr)'}`, color: queue.length > 0 ? 'var(--marigold-dark)' : 'var(--teal-dark)' }}>
                  {queue.length} pending
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-0" style={{ borderBottom: '1.5px solid var(--line-md)' }}>
            {[
              { key: 'queue', label: `Queue (${queue.length})` },
              { key: 'reviewed', label: 'Recently Reviewed' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)} className={`tab-btn ${tab === t.key ? 'active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Queue tab */}
          {tab === 'queue' && (
            <div className="mt-6">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="font-display text-5xl" style={{ color: 'var(--teal-bdr)' }}>✓</div>
                  <p className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>All clear</p>
                  <p className="font-mono text-sm" style={{ color: 'var(--ink-4)' }}>No pending KYC submissions.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {queue.map(b => (
                    <KycCard key={b.id} borrower={b} onDone={() => removeFromQueue(b.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviewed tab */}
          {tab === 'reviewed' && (
            <div className="mt-6">
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--line-md)', borderRadius: 6, overflow: 'hidden' }}>
                <div className="punch-line" />
                {reviewedBorrowers.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="font-mono text-sm" style={{ color: 'var(--ink-4)' }}>No reviews yet.</p>
                  </div>
                ) : reviewedBorrowers.map((b, i) => (
                  <div key={b.id} className="reviewed-row" style={{ borderBottom: i < reviewedBorrowers.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{b.first_name} {b.last_name}</p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>{b.email} · {b.employment_type ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {b.kyc_status === 'verified' && (
                        <span className="font-mono text-xs" style={{ color: 'var(--teal-dark)' }}>{peso(b.credit_limit)} limit</span>
                      )}
                      <span className="status-pill" style={{
                        background: b.kyc_status === 'verified' ? 'var(--teal-bg)' : 'var(--magenta-bg)',
                        color: b.kyc_status === 'verified' ? 'var(--teal-dark)' : 'var(--magenta)',
                        border: `1px solid ${b.kyc_status === 'verified' ? 'var(--teal-bdr)' : 'var(--magenta-bdr)'}`,
                      }}>
                        {b.kyc_status === 'verified' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-4)' }}>{formatDate(b.updated_at)}</span>
                    </div>
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