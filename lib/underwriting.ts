import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface UnderwritingInput {
  borrowerId:      string
  principalAmount: number
  termDays:        number
  purpose:         string
}

export interface UnderwritingResult {
  approved:        boolean
  status:          'approved' | 'rejected'
  score:           number
  interestRate:    number
  serviceFeeRate:  number
  rejectionReason: string | null
  scoreBreakdown:  ScoreBreakdown
}

interface ScoreBreakdown {
  base:            number
  repaymentBonus:  number
  employmentBonus: number
  incomeBonus:     number
  defaultPenalty:  number
  overduePenalty:  number
  dtiPenalty:      number
  flags:           string[]
}

// computeScore returns the breakdown AND the final clamped score so the
// caller never has to recompute it from the components (which could diverge
// after clamping).
interface ScoreResult {
  breakdown: ScoreBreakdown
  score:     number
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const APPROVAL_THRESHOLD  = 50
const BASE_SCORE          = 50

const POINTS_PER_COMPLETED_LOAN = 10
const POINTS_PERFECT_REPAYMENT  = 20
const POINTS_GOOD_REPAYMENT     = 10
const POINTS_EMPLOYMENT: Record<string, number> = {
  employed:       15,
  business_owner: 12,
  self_employed:  10,
  freelance:       7,
  student:         5,
  unemployed:      0,
}
const PENALTY_PER_DEFAULT   = 40
const PENALTY_PER_OVERDUE   = 20
const PENALTY_HIGH_DTI      = 15
const PENALTY_VERY_HIGH_DTI = 25

const PRICING_TIERS = [
  { minScore: 80, interestRate: 3.0,  serviceFeeRate: 2.0 },
  { minScore: 65, interestRate: 4.5,  serviceFeeRate: 3.0 },
  { minScore: 50, interestRate: 6.0,  serviceFeeRate: 4.0 },
  { minScore:  0, interestRate: 8.0,  serviceFeeRate: 5.0 },
]

// ─────────────────────────────────────────────
// HARD STOP CHECKS — instant rejection, no score
// ─────────────────────────────────────────────

interface HardStop {
  triggered: boolean
  reason:    string
}

function checkHardStops(
  borrower: any,
  principalAmount: number,
  outstandingPrincipal: number
): HardStop {
  // 1. KYC must be verified
  if (borrower.kyc_status !== 'verified') {
    return { triggered: true, reason: 'Identity verification (KYC) is not yet approved. Please complete verification before applying.' }
  }

  // 2. Available credit must cover the new request. Overdue loans are
  // included in outstandingPrincipal like any other open loan — they reduce
  // headroom but don't block outright. Repayment-behavior risk is instead
  // captured as a scoring penalty.
  const creditLimit = Number(borrower.credit_limit ?? 0)
  const availableCredit = Math.max(0, creditLimit - outstandingPrincipal)
  if (principalAmount > availableCredit) {
    return {
      triggered: true,
      reason: outstandingPrincipal > 0
        ? `This exceeds your available credit. You have ₱${outstandingPrincipal.toLocaleString()} outstanding against a ₱${creditLimit.toLocaleString()} limit — your maximum new loan right now is ₱${availableCredit.toLocaleString()}.`
        : `This exceeds your credit limit of ₱${creditLimit.toLocaleString()}.`
    }
  }

  // 3. Unemployed with no guardian — no income source at all
  if (borrower.employment_type === 'unemployed' && !borrower.guardian_monthly_income) {
    return { triggered: true, reason: 'Applicants with no income source or guardian income are not eligible for a loan at this time.' }
  }

  // 4. Student with no school on file
  if (borrower.employment_type === 'student' && !borrower.school_name) {
    return { triggered: true, reason: 'Student applicants must have a verified school name on their profile.' }
  }

  return { triggered: false, reason: '' }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// FIX #1 — DTI: existingMonthlyObligation was the raw sum of ALL remaining
// installment amounts across all open loans, which wildly overstated the
// monthly burden (e.g. 12 × ₱1,000 remaining → treated as ₱12,000/month).
//
// Correct approach: for each open loan take only its NEXT unpaid installment
// (the one that represents the upcoming month's obligation), then sum those.
// Since installments are fetched ordered by installment_number ASC, the first
// entry we encounter per loan_id is that loan's next-due installment.
//
// This means the query must include installment_number and be sorted ascending
// (see the query in evaluateLoanApplication).
function computeMonthlyObligation(installments: any[]): number {
  const nextDueByLoan = new Map<string, number>()
  for (const inst of installments) {
    if (!nextDueByLoan.has(inst.loan_id)) {
      // First entry per loan = smallest installment_number = next due
      nextDueByLoan.set(inst.loan_id, Number(inst.amount_due))
    }
  }
  return Array.from(nextDueByLoan.values()).reduce((sum, v) => sum + v, 0)
}

// ─────────────────────────────────────────────
// SCORE COMPUTATION
// ─────────────────────────────────────────────

function computeScore(
  borrower:                  any,
  principalAmount:           number,
  termDays:                  number,
  loanHistory:               any[],   // completed + defaulted only (no overdue — see note below)
  installments:              any[],   // unpaid installments on open loans, ordered by installment_number ASC
  hasOpenOverdue:            boolean, // derived from openLoans, not loanHistory
  existingMonthlyObligation: number   // pre-computed via computeMonthlyObligation()
): ScoreResult {
  const flags: string[] = []
  let score = BASE_SCORE

  // ── 1. Repayment history ──
  // FIX #2 — overdue double-count: loanHistory no longer includes 'overdue'
  // rows (they were moved to openLoans). hasOpenOverdue already captures the
  // current overdue signal. Counting overdue from BOTH sources would penalize
  // the borrower twice for the same loan.
  const completedLoans = loanHistory.filter(l => l.status === 'completed')
  const defaultedLoans = loanHistory.filter(l => l.status === 'defaulted')

  const repaymentBonus = Math.min(completedLoans.length, 3) * POINTS_PER_COMPLETED_LOAN
  score += repaymentBonus
  if (completedLoans.length > 0) flags.push(`${completedLoans.length} completed loan(s)`)

  const defaultPenalty = defaultedLoans.length * PENALTY_PER_DEFAULT
  score -= defaultPenalty
  if (defaultedLoans.length > 0) flags.push(`${defaultedLoans.length} defaulted loan(s)`)

  // Open overdue penalty — single source of truth from hasOpenOverdue
  const overduePenalty = hasOpenOverdue ? PENALTY_PER_OVERDUE : 0
  score -= overduePenalty
  if (hasOpenOverdue) flags.push('Currently has an overdue loan')

  // ── 2. Installment payment behaviour ──
  let incomeBonus = 0
  const totalInstallments = installments.length
  const paidOnTime        = installments.filter(i => i.status === 'paid').length
  const overdueInstallments = installments.filter(i => i.status === 'overdue').length

  let repaymentBonus2 = 0
  if (totalInstallments > 0) {
    const ratio = paidOnTime / totalInstallments
    if (overdueInstallments === 0 && ratio === 1) {
      repaymentBonus2 = POINTS_PERFECT_REPAYMENT
      flags.push('Perfect installment repayment record')
    } else if (ratio >= 0.8) {
      repaymentBonus2 = POINTS_GOOD_REPAYMENT
      flags.push('Good installment repayment record (≥80%)')
    }
  }
  score += repaymentBonus2

  // ── 3. Employment type ──
  const employmentBonus = POINTS_EMPLOYMENT[borrower.employment_type] ?? 0
  score += employmentBonus
  flags.push(`Employment: ${borrower.employment_type}`)

  // ── 4. Debt-to-income ratio ──
  // existingMonthlyObligation is now the sum of each open loan's NEXT
  // installment only (see computeMonthlyObligation), so this correctly
  // reflects the borrower's actual current monthly burden rather than the
  // total of all future payments.
  const effectiveIncome: number =
    borrower.employment_type === 'student'
      ? (borrower.guardian_monthly_income ?? 0)
      : (borrower.monthly_income ?? 0)

  let dtiPenalty = 0
  if (effectiveIncome > 0) {
    const termMonths = Math.max(1, termDays / 30)
    const newLoanMonthlyPayment  = principalAmount / termMonths
    const estimatedMonthlyPayment = newLoanMonthlyPayment + existingMonthlyObligation
    const dtiRatio = estimatedMonthlyPayment / effectiveIncome

    if (dtiRatio > 0.6) {
      dtiPenalty = PENALTY_VERY_HIGH_DTI
      flags.push(`DTI ratio very high (${(dtiRatio * 100).toFixed(0)}%)`)
    } else if (dtiRatio > 0.4) {
      dtiPenalty = PENALTY_HIGH_DTI
      flags.push(`DTI ratio elevated (${(dtiRatio * 100).toFixed(0)}%)`)
    } else {
      incomeBonus = 10
      flags.push(`DTI ratio healthy (${(dtiRatio * 100).toFixed(0)}%)`)
    }
  } else {
    dtiPenalty = 5
    flags.push('No income data on file')
  }
  score -= dtiPenalty
  score += incomeBonus

  // FIX #3 — clamp once here and return the clamped value. The caller uses
  // this directly instead of recomputing from breakdown components, which
  // could diverge after clamping.
  const finalScore = Math.max(0, Math.min(100, score))

  return {
    score: finalScore,
    breakdown: {
      base:            BASE_SCORE,
      repaymentBonus:  repaymentBonus + repaymentBonus2,
      employmentBonus,
      incomeBonus,
      defaultPenalty,
      overduePenalty,
      dtiPenalty,
      flags,
    },
  }
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────

function getPricing(score: number): { interestRate: number; serviceFeeRate: number } {
  const tier = PRICING_TIERS.find(t => score >= t.minScore)!
  return { interestRate: tier.interestRate, serviceFeeRate: tier.serviceFeeRate }
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  base: 0, repaymentBonus: 0, employmentBonus: 0, incomeBonus: 0,
  defaultPenalty: 0, overduePenalty: 0, dtiPenalty: 0, flags: [],
}

export async function evaluateLoanApplication(
  supabase: SupabaseClient,
  input: UnderwritingInput
): Promise<UnderwritingResult> {
  const { borrowerId, principalAmount, termDays } = input

  const [
    { data: borrower },
    { data: loanHistory },
    { data: openLoans },
    { data: installments },
  ] = await Promise.all([
    supabase
      .from('borrowers')
      .select('kyc_status, employment_type, monthly_income, credit_limit, school_name, guardian_monthly_income')
      .eq('id', borrowerId)
      .single(),

    // FIX #2 — 'overdue' removed from loanHistory. An overdue loan is an
    // OPEN loan (it still appears in openLoans), not a historical one.
    // Including it here AND deriving hasOpenOverdue from openLoans was
    // penalizing the borrower twice for the same loan.
    supabase
      .from('loans')
      .select('status')
      .eq('borrower_id', borrowerId)
      .in('status', ['completed', 'defaulted']),

    // All currently-open loans (including overdue) — used for available-
    // credit calc and the hasOpenOverdue scoring flag.
    supabase
      .from('loans')
      .select('id, status, principal_amount')
      .eq('borrower_id', borrowerId)
      .in('status', ['approved', 'disbursed', 'active', 'overdue']),

    // FIX #1 — installment_number added and results ordered ASC so that
    // computeMonthlyObligation can take the first (next-due) installment
    // per loan without a secondary sort.
    supabase
      .from('loan_installments')
      .select('status, amount_due, loan_id, installment_number, loans!inner(borrower_id, status)')
      .eq('loans.borrower_id', borrowerId)
      .in('loans.status', ['approved', 'disbursed', 'active', 'overdue'])
      .in('status', ['upcoming', 'due', 'overdue'])
      .order('installment_number', { ascending: true }),
  ])

  if (!borrower) {
    return {
      approved: false,
      status: 'rejected',
      score: 0,
      interestRate: 0,
      serviceFeeRate: 0,
      rejectionReason: 'Borrower profile not found.',
      scoreBreakdown: { ...EMPTY_BREAKDOWN, flags: ['Borrower not found'] },
    }
  }

  const outstandingPrincipal = (openLoans ?? []).reduce(
    (sum, l) => sum + Number(l.principal_amount), 0
  )
  const hasOpenOverdue = (openLoans ?? []).some(l => l.status === 'overdue')

  // FIX #1 — monthly obligation derived from next-due installment per loan
  const existingMonthlyObligation = computeMonthlyObligation(installments ?? [])

  // ── Hard stops first ──
  const hardStop = checkHardStops(borrower, principalAmount, outstandingPrincipal)
  if (hardStop.triggered) {
    return {
      approved: false,
      status: 'rejected',
      score: 0,
      interestRate: 0,
      serviceFeeRate: 0,
      rejectionReason: hardStop.reason,
      scoreBreakdown: { ...EMPTY_BREAKDOWN, flags: ['Hard stop triggered'] },
    }
  }

  // ── Score ──
  // FIX #3 — use the score returned by computeScore directly. No
  // recomputation from breakdown components (which could diverge post-clamp).
  const { score: finalScore, breakdown } = computeScore(
    borrower,
    principalAmount,
    termDays,
    loanHistory ?? [],
    installments ?? [],
    hasOpenOverdue,
    existingMonthlyObligation
  )

  const approved = finalScore >= APPROVAL_THRESHOLD
  const pricing  = getPricing(finalScore)

  return {
    approved,
    status:          approved ? 'approved' : 'rejected',
    score:           finalScore,
    interestRate:    pricing.interestRate,
    serviceFeeRate:  pricing.serviceFeeRate,
    rejectionReason: approved
      ? null
      : `Application score (${finalScore}/100) did not meet the minimum threshold of ${APPROVAL_THRESHOLD}. Factors: ${breakdown.flags.join(', ')}.`,
    scoreBreakdown: breakdown,
  }
}