// lib/credit.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAvailableCredit(supabase: SupabaseClient, borrowerId: string) {
  const [{ data: borrower }, { data: openLoans }] = await Promise.all([
    supabase.from('borrowers').select('credit_limit').eq('id', borrowerId).single(),
    supabase
      .from('loans')
      .select('principal_amount')
      .eq('borrower_id', borrowerId)
      .in('status', ['approved', 'disbursed', 'active', 'overdue']),
  ])

  const creditLimit = Number(borrower?.credit_limit ?? 0)
  const outstandingPrincipal = (openLoans ?? []).reduce((sum, l) => sum + Number(l.principal_amount), 0)

  return {
    creditLimit,
    outstandingPrincipal,
    availableCredit: Math.max(0, creditLimit - outstandingPrincipal),
  }
}