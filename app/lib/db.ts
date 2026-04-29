import { createClient } from './supabase'
import type { Transaction } from './data'

interface TxnRow {
  id: string
  date: string
  description: string
  amount: number
  is_income: boolean
  category_id: string
  member_id: string
}

interface BudgetRow {
  category_id: string
  amount: number
}

function rowToTransaction(row: TxnRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    isIncome: row.is_income,
    categoryId: row.category_id,
    memberId: row.member_id,
  }
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TxnRow[]).map(rowToTransaction)
}

export async function insertTransaction(txn: Transaction): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('transactions').insert({
    id: txn.id,
    date: txn.date,
    description: txn.description,
    amount: txn.amount,
    is_income: txn.isIncome,
    category_id: txn.categoryId,
    member_id: txn.memberId,
  })
  if (error) throw error
}

export async function removeTransaction(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function fetchBudgets(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('budgets').select('*')
  if (error) throw error
  return Object.fromEntries((data as BudgetRow[]).map(r => [r.category_id, r.amount]))
}

export async function upsertBudget(categoryId: string, amount: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('budgets')
    .upsert({ category_id: categoryId, amount }, { onConflict: 'category_id' })
  if (error) throw error
}

export { rowToTransaction, type TxnRow, type BudgetRow }
