// supabase/functions/mark-overdue/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date().toISOString().split('T')[0]

  // Mark past-due installments as overdue
  await supabase
    .from('loan_installments')
    .update({ status: 'overdue' })
    .lt('due_date', today)
    .in('status', ['upcoming', 'due'])

  // Mark loans as overdue if they have overdue installments
  const { data: overdueInstallments } = await supabase
    .from('loan_installments')
    .select('loan_id')
    .eq('status', 'overdue')

const loanIds = [...new Set((overdueInstallments || []).map((i: { loan_id: string }) => i.loan_id))]
  if (loanIds.length > 0) {
    await supabase
      .from('loans')
      .update({ status: 'overdue' })
      .in('id', loanIds)
      .in('status', ['active', 'disbursed'])
  }

  return new Response(JSON.stringify({ updated: loanIds.length }))
})