import { db, type Tx } from "./db";
import { now } from "./clock";

/**
 * PostgreSQL-backed job queue. Jobs are due when run_at <= the application clock, so
 * moving the demo clock forward (FR-M38-10) makes deadlines, holds and reminders fire
 * as they would at that time. `tick()` runs from /api/cron/tick, the dev interval and
 * right after a demo-clock change.
 */
export type JobHandler = (payload: Record<string, unknown>, ctx: { now: Date; jobId: number }) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJob(kind: string, handler: JobHandler): void {
  handlers.set(kind, handler);
}

export async function schedule(
  kind: string,
  runAt: Date,
  payload: Record<string, unknown> = {},
  opts: { uniqueKey?: string } = {},
  sql: Tx = db(),
): Promise<void> {
  await sql`
    insert into jobs (kind, run_at, payload, unique_key, created_at)
    values (${kind}, ${runAt}, ${sql.json(payload as never)}, ${opts.uniqueKey ?? null}, now())
    on conflict (unique_key) do update set run_at = excluded.run_at, payload = excluded.payload, status = 'pending', attempts = 0
    `;
}

export async function cancelJobs(uniqueKeyPrefix: string, sql: Tx = db()): Promise<void> {
  await sql`update jobs set status = 'cancelled' where status = 'pending' and unique_key like ${uniqueKeyPrefix + "%"}`;
}

/** Runs every due job once. Returns the number processed. */
export async function tick(limit = 200): Promise<number> {
  const { registerAllJobs } = await import("@/server/jobs");
  registerAllJobs();
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const at = await now();
    const claimed = await db()`
      update jobs set status = 'running', attempts = attempts + 1
      where id = (
        select id from jobs where status = 'pending' and run_at <= ${at}
        order by run_at, id limit 1 for update skip locked)
      returning id, kind, payload`;
    const job = claimed[0];
    if (!job) break;
    const handler = handlers.get(String(job.kind));
    try {
      if (!handler) throw new Error(`no handler for ${String(job.kind)}`);
      await handler(job.payload as Record<string, unknown>, { now: at, jobId: Number(job.id) });
      await db()`update jobs set status = 'done', done_at = ${at} where id = ${job.id}`;
    } catch (e) {
      console.error(`[jobs] ${String(job.kind)} failed`, e);
      await db()`
        update jobs set status = case when attempts >= 3 then 'failed' else 'pending' end,
          last_error = ${String(e)}, run_at = ${new Date(at.getTime() + 60_000)}
        where id = ${job.id}`;
    }
    processed++;
  }
  return processed;
}
