import { db, num, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";

/**
 * Sandbox ledger (FR-M16-07): append-only, double entry. Each row moves `amount` from the
 * credit account to the debit account. Accounts:
 *   organizer_paid (money the organizer paid in, sandbox), held, venue_payable,
 *   spotin_commission, spotin_fee, refunds.
 */
export type Account = "organizer_paid" | "held" | "venue_payable" | "spotin_commission" | "spotin_fee" | "refunds";

export async function post(
  bookingId: string,
  entries: { debit: Account; credit: Account; amount: number; refType: string; refId?: string; memo?: string }[],
  sql: Tx = db(),
): Promise<void> {
  const at = await now();
  for (const e of entries) {
    if (e.amount <= 0) continue;
    await sql`
      insert into ledger_entries (booking_id, debit_account, credit_account, amount, ref_type, ref_id, memo, created_at)
      values (${bookingId}, ${e.debit}, ${e.credit}, ${e.amount}, ${e.refType}, ${e.refId ?? null}, ${e.memo ?? null}, ${at})`;
  }
}

/** Balance per account (debits minus credits). */
export async function balances(bookingId: string, sql: Tx = db()): Promise<Record<Account, number>> {
  const rows = await sql`
    select acct, sum(v)::bigint as v from (
      select debit_account as acct, amount as v from ledger_entries where booking_id = ${bookingId}
      union all select credit_account, -amount from ledger_entries where booking_id = ${bookingId}) x group by acct`;
  const out = { organizer_paid: 0, held: 0, venue_payable: 0, spotin_commission: 0, spotin_fee: 0, refunds: 0 } as Record<Account, number>;
  for (const r of rows) out[r.acct as Account] = num(r.v);
  return out;
}

/**
 * Reconciliation (FR-M24-05): ledger inflow equals paid payments; receipts minus credit notes
 * equal paid minus refunded; paid never exceeds the accepted quote's organizer total.
 */
export async function reconcile(bookingId: string, sql: Tx = db()): Promise<{ ok: boolean; problems: string[]; figures: Record<string, number> }> {
  const [p] = await sql`
    select coalesce(sum(amount) filter (where status in ('paid', 'refunded')), 0)::bigint as paid,
           coalesce(sum(refunded_amount), 0)::bigint as refunded from payments where booking_id = ${bookingId}`;
  const [r] = await sql`
    select coalesce(sum(amount) filter (where kind = 'receipt'), 0)::bigint as receipts,
           coalesce(sum(amount) filter (where kind = 'credit_note'), 0)::bigint as credits from receipts where booking_id = ${bookingId}`;
  const [q] = await sql`select (qt.totals ->> 'organizerTotal')::bigint as total from bookings b join quotes qt on qt.id = b.quote_id where b.id = ${bookingId}`;
  const [inflow] = await sql`select coalesce(sum(amount), 0)::bigint as v from ledger_entries where booking_id = ${bookingId} and credit_account = 'organizer_paid'`;
  const [refundsOut] = await sql`select coalesce(sum(amount), 0)::bigint as v from ledger_entries where booking_id = ${bookingId} and debit_account = 'refunds'`;
  const figures = { paid: num(p!.paid), refunded: num(p!.refunded), receipts: num(r!.receipts), creditNotes: num(r!.credits), quoteTotal: num(q?.total), ledgerInflow: num(inflow!.v), ledgerRefunds: num(refundsOut!.v) };
  const problems: string[] = [];
  if (figures.ledgerInflow !== figures.paid) problems.push("ledger_inflow_vs_payments");
  if (figures.ledgerRefunds !== figures.refunded) problems.push("ledger_refunds_vs_payments");
  if (figures.receipts - figures.creditNotes !== figures.paid - figures.refunded) problems.push("receipts_vs_payments");
  if (figures.paid > figures.quoteTotal) problems.push("paid_above_quote");
  const b = await balances(bookingId, sql);
  const total = Object.values(b).reduce((s, v) => s + v, 0);
  if (total !== 0) problems.push("ledger_unbalanced");
  return { ok: problems.length === 0, problems, figures };
}
